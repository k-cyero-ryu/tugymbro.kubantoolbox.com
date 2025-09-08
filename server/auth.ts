import bcrypt from "bcrypt";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { loginUserSchema, registerUserSchema, type User } from "@shared/schema";

// Password hashing utilities
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Session configuration
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || "fallback-secret-for-development",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

// Authentication middleware
export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// Setup authentication routes and middleware
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Registration endpoint
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = registerUserSchema.parse(req.body);
      
      // Special handling for SuperAdmin registration
      if (validatedData.role === 'superadmin') {
        // Validate setup key for SuperAdmin accounts
        const expectedSetupKey = process.env.SUPERADMIN_SETUP_KEY || 'your-secure-setup-key-2025';
        if (!validatedData.setupKey || validatedData.setupKey !== expectedSetupKey) {
          return res.status(400).json({ message: "Invalid setup key" });
        }

        // Check if any SuperAdmin already exists
        const existingSuperAdmin = await storage.getUsersByRole('superadmin');
        if (existingSuperAdmin.length > 0) {
          return res.status(400).json({ message: "SuperAdmin already exists. Contact existing SuperAdmin for account creation." });
        }
      }
      
      // Check if username or email already exists
      const existingUser = await storage.getUserByEmailOrUsername(validatedData.email, validatedData.username);
      if (existingUser) {
        return res.status(400).json({ 
          message: existingUser.email === validatedData.email 
            ? "Email already exists" 
            : "Username already exists" 
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(validatedData.password);

      // Create user
      const newUser = await storage.createUser({
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: validatedData.role || 'client',
        status: validatedData.role === 'trainer' ? 'pending' : 'active' // Trainers need approval
      });

      // Handle role-specific setup
      if (validatedData.role === 'trainer') {
        // Generate unique referral code for trainer
        const referralCodeValue = `TR${Date.now().toString().slice(-6)}${newUser.id.slice(-2)}`;
        await storage.createTrainer({
          userId: newUser.id,
          referralCode: referralCodeValue,
          expertise: '',
          experience: '',
        });
      } else if (validatedData.role === 'client' || !validatedData.role) {
        // Handle referral code for client
        let trainerId = null;
        if (validatedData.referralCode) {
          const trainer = await storage.getTrainerByReferralCode(validatedData.referralCode);
          if (trainer) {
            trainerId = trainer.id;
          }
        }

        // Create client record (with or without trainer assignment)
        if (trainerId) {
          await storage.createClient({
            userId: newUser.id,
            trainerId: trainerId,
          });
        }
      }

      // Set session
      (req.session as any).userId = newUser.id;

      // Return user without password
      const { password, ...userWithoutPassword } = newUser;
      res.status(201).json({ user: userWithoutPassword });
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const validatedData = loginUserSchema.parse(req.body);

      // Find user by username
      const user = await storage.getUserByUsername(validatedData.username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Verify password
      const isValidPassword = await verifyPassword(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Check if user is active
      if (user.status !== 'active') {
        return res.status(401).json({ message: "Account is not active" });
      }

      // Set session
      (req.session as any).userId = user.id;

      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user endpoint
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      
      // Get additional user data based on role
      let additionalData = {};
      if (user.role === 'trainer') {
        const trainer = await storage.getTrainerByUserId(user.id);
        if (trainer) {
          additionalData = { trainer };
        }
      } else if (user.role === 'client') {
        const client = await storage.getClientByUserId(user.id);
        if (client) {
          additionalData = { client };
        }
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json({ ...userWithoutPassword, ...additionalData });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // SuperAdmin password reset endpoint
  app.post('/api/auth/reset-password', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user as User;
      
      // Only SuperAdmin can reset passwords
      if (currentUser.role !== 'superadmin') {
        return res.status(403).json({ message: "Access denied. SuperAdmin role required." });
      }

      const { userId, newPassword } = req.body;
      
      if (!userId || !newPassword) {
        return res.status(400).json({ message: "User ID and new password are required" });
      }

      // Validate password length
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Check if target user exists
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);

      // Update the password
      await storage.resetUserPassword(userId, hashedPassword);

      res.json({ 
        success: true, 
        message: `Password reset successfully for ${targetUser.firstName || targetUser.username}` 
      });
    } catch (error: any) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Password reset failed" });
    }
  });
}