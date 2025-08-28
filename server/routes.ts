import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { insertTrainerSchema, insertClientSchema, insertTrainingPlanSchema, insertExerciseSchema, insertPostSchema, insertChatMessageSchema, insertClientPlanSchema, insertMonthlyEvaluationSchema, insertPaymentPlanSchema, insertClientPaymentPlanSchema, paymentPlans, clientPaymentPlans, type User } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Extend WebSocket type to include userId
interface ExtendedWebSocket extends WebSocket {
  userId?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get additional user data based on role
      let additionalData = {};
      if (user.role === 'trainer') {
        const trainer = await storage.getTrainerByUserId(userId);
        if (trainer) {
          additionalData = { trainer };
        }
      } else if (user.role === 'client') {
        const client = await storage.getClientByUserId(userId);
        if (client) {
          additionalData = { client };
        }
      }
      
      res.json({ ...user, ...additionalData });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Role selection endpoint
  app.post('/api/users/select-role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { role, trainerData, referralCode } = req.body;

      if (!['trainer', 'client'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be 'trainer' or 'client'" });
      }

      // Update user role
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update user role and status
      const updatedUser = await storage.upsertUser({
        ...user,
        role: role,
        status: role === 'trainer' ? 'pending' : 'active', // Trainers need approval
      });

      // Create role-specific records
      if (role === 'trainer') {
        // Generate unique referral code
        const referralCodeValue = `TR${Date.now().toString().slice(-6)}${userId.slice(-2)}`;
        
        await storage.createTrainer({
          userId: userId,
          referralCode: referralCodeValue,
          expertise: trainerData?.expertise || '',
          experience: trainerData?.experience || '',
        });
      } else if (role === 'client') {
        // Find trainer by referral code if provided
        let trainerId = null;
        if (referralCode) {
          const trainer = await storage.getTrainerByReferralCode(referralCode);
          if (trainer) {
            trainerId = trainer.id;
          }
        }

        if (trainerId) {
          await storage.createClient({
            userId: userId,
            trainerId: trainerId,
          });
        }
        // If no referral code or trainer not found, client will be created without a trainer
      }

      res.json({ 
        success: true, 
        user: updatedUser,
        message: role === 'trainer' 
          ? 'Trainer profile created! Your account is pending approval.' 
          : 'Client profile created successfully!'
      });

    } catch (error) {
      console.error("Error selecting role:", error);
      res.status(500).json({ message: "Failed to select role" });
    }
  });

  // Superadmin management endpoint
  app.post('/api/admin/promote-superadmin', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(currentUserId);
      
      // Only existing superadmins can promote others
      if (!currentUser || currentUser.role !== 'superadmin') {
        return res.status(403).json({ message: "Only superadmins can promote users" });
      }

      const { userEmail } = req.body;
      if (!userEmail) {
        return res.status(400).json({ message: "User email is required" });
      }

      // Find user by email and promote to superadmin
      const targetUser = await storage.getUserByEmail(userEmail);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await storage.upsertUser({
        ...targetUser,
        role: 'superadmin',
        status: 'active',
      });

      res.json({ 
        success: true, 
        user: updatedUser,
        message: 'User promoted to superadmin successfully!'
      });

    } catch (error) {
      console.error("Error promoting user to superadmin:", error);
      res.status(500).json({ message: "Failed to promote user" });
    }
  });

  // Initial superadmin setup endpoint (for bootstrapping)
  app.post('/api/admin/setup-superadmin', async (req, res) => {
    try {
      const { email, setupKey } = req.body;
      
      // Check setup key (use environment variable for security)
      const expectedSetupKey = process.env.SUPERADMIN_SETUP_KEY || 'replit-fitness-admin-2025';
      if (setupKey !== expectedSetupKey) {
        return res.status(403).json({ message: "Invalid setup key" });
      }

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if any superadmin already exists - allow setup if no SuperAdmins exist
      try {
        const existingSuperAdmins = await storage.getUsersByRole('superadmin');
        if (existingSuperAdmins.length > 0) {
          // If there are existing superadmins, use the promote endpoint instead
          return res.status(403).json({ message: "SuperAdmin already exists. Use the promote endpoint instead." });
        }
      } catch (error) {
        console.log("Error checking existing superadmins:", error);
        // If error checking, allow setup to proceed
      }

      // Find user by email
      const targetUser = await storage.getUserByEmail(email);
      if (!targetUser) {
        return res.status(404).json({ 
          message: "User not found. Please ensure the user has logged in at least once." 
        });
      }

      // Promote to superadmin
      const updatedUser = await storage.upsertUser({
        ...targetUser,
        role: 'superadmin',
        status: 'active',
      });

      res.json({ 
        success: true, 
        user: updatedUser,
        message: 'SuperAdmin account created successfully!'
      });

    } catch (error) {
      console.error("Error setting up superadmin:", error);
      res.status(500).json({ message: "Failed to setup superadmin" });
    }
  });

  // Public object storage routes for exercise media and evaluation photos
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Object storage routes - serve public files without authentication
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  // Trainer routes
  app.post('/api/trainers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trainerData = insertTrainerSchema.parse(req.body);
      
      // Generate unique referral code
      const referralCode = `TRAINER${Date.now()}`;
      
      const trainer = await storage.createTrainer({
        ...trainerData,
        userId,
        referralCode,
      });
      
      res.status(201).json(trainer);
    } catch (error) {
      console.error("Error creating trainer:", error);
      res.status(500).json({ message: "Failed to create trainer" });
    }
  });

  // Get current trainer's clients and referral info (MUST come before /:id routes)
  app.get('/api/trainers/clients', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trainer = await storage.getTrainerByUserId(userId);
      
      if (!trainer) {
        return res.status(404).json({ 
          message: "Trainer not found",
          userId,
          hint: "This user might not be registered as a trainer"
        });
      }
      
      const clients = await storage.getClientsByTrainer(trainer.id);
      const baseUrl = `${req.protocol}://${req.hostname}`;
      const referralUrl = `${baseUrl}/register/client?code=${trainer.referralCode}`;
      
      res.json({
        clients,
        referralCode: trainer.referralCode,
        referralUrl
      });
    } catch (error) {
      console.error("Error fetching trainer clients:", error);
      res.status(500).json({ message: "Failed to fetch trainer clients" });
    }
  });

  app.get('/api/trainers/:id', isAuthenticated, async (req, res) => {
    try {
      const trainer = await storage.getTrainer(req.params.id);
      if (!trainer) {
        return res.status(404).json({ message: "Trainer not found" });
      }
      res.json(trainer);
    } catch (error) {
      console.error("Error fetching trainer:", error);
      res.status(500).json({ message: "Failed to fetch trainer" });
    }
  });

  // Current trainer profile with payment plan
  app.get('/api/trainers/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log('[DEBUG] Fetching trainer profile for user ID:', userId);
      
      const trainer = await storage.getTrainerByUserId(userId);
      console.log('[DEBUG] Found trainer:', trainer);
      console.log('[DEBUG] Trainer exists check:', !!trainer);
      console.log('[DEBUG] Trainer type:', typeof trainer);
      
      if (!trainer) {
        console.log('[DEBUG] No trainer found for user ID:', userId);
        return res.status(404).json({ message: "Trainer not found" });
      }
      
      // Get user details
      const user = await storage.getUser(userId);
      console.log('[DEBUG] Found user:', user);
      
      // Get assigned payment plan
      let paymentPlan = null;
      if (trainer.paymentPlanId) {
        const [plan] = await db.select().from(paymentPlans).where(eq(paymentPlans.id, trainer.paymentPlanId));
        paymentPlan = plan;
        console.log('[DEBUG] Found payment plan:', paymentPlan);
      }
      
      res.json({
        ...trainer,
        user,
        paymentPlan
      });
    } catch (error) {
      console.error("Error fetching trainer profile:", error);
      res.status(500).json({ message: "Failed to fetch trainer profile" });
    }
  });

  // Current trainer stats
  app.get('/api/trainers/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log('[DEBUG] Fetching trainer stats for user ID:', userId);
      
      const trainer = await storage.getTrainerByUserId(userId);
      console.log('[DEBUG] Found trainer:', trainer);
      console.log('[DEBUG] Trainer exists check:', !!trainer);
      console.log('[DEBUG] Trainer type:', typeof trainer);
      
      if (!trainer) {
        console.log('[DEBUG] No trainer found for user ID:', userId);
        return res.status(404).json({ message: "Trainer not found" });
      }
      
      const stats = await storage.getTrainerStats(trainer.id);
      console.log('[DEBUG] Trainer stats:', stats);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching trainer stats:", error);
      res.status(500).json({ message: "Failed to fetch trainer stats" });
    }
  });

  app.get('/api/trainers/:id/stats', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getTrainerStats(req.params.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching trainer stats:", error);
      res.status(500).json({ message: "Failed to fetch trainer stats" });
    }
  });

  app.get('/api/trainers/:id/clients', isAuthenticated, async (req, res) => {
    try {
      const clients = await storage.getClientsByTrainer(req.params.id);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching trainer clients:", error);
      res.status(500).json({ message: "Failed to fetch trainer clients" });
    }
  });

  // Invite client by email (for trainers)
  app.post('/api/trainers/invite-client', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trainer = await storage.getTrainerByUserId(userId);
      if (!trainer) {
        return res.status(403).json({ message: "Only approved trainers can invite clients" });
      }

      const { email, firstName, lastName } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        // Check if they're already a client
        const existingClient = await storage.getClientByUserId(existingUser.id);
        if (existingClient) {
          return res.status(400).json({ message: "This person is already registered as a client" });
        }
        
        // Create client record for existing user
        const client = await storage.createClient({
          userId: existingUser.id,
          trainerId: trainer.id,
          referralSource: trainer.referralCode,
          goals: '',
          currentWeight: 0,
          targetWeight: 0,
          height: 0,
          activityLevel: 'moderate',
        });
        
        return res.status(201).json({ 
          message: "User successfully added as your client", 
          client,
          existing: true 
        });
      }

      // Generate referral URL for new users
      const baseUrl = `${req.protocol}://${req.hostname}`;
      const referralUrl = `${baseUrl}/register/client?code=${trainer.referralCode}`;
      
      res.status(200).json({ 
        message: `Share this registration link with ${email}`,
        referralCode: trainer.referralCode,
        referralUrl,
        inviteEmail: email,
        firstName,
        lastName
      });
    } catch (error) {
      console.error("Error inviting client:", error);
      res.status(500).json({ message: "Failed to send client invitation" });
    }
  });

  // Client registration with referral code
  app.post('/api/clients/register', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { referralCode, ...clientData } = req.body;
      
      // Find trainer by referral code
      const trainer = await storage.getTrainerByReferralCode(referralCode);
      if (!trainer) {
        return res.status(400).json({ message: "Invalid referral code" });
      }
      
      const client = await storage.createClient({
        ...insertClientSchema.parse(clientData),
        userId,
        trainerId: trainer.id,
        referralSource: referralCode,
      });
      
      res.status(201).json(client);
    } catch (error) {
      console.error("Error registering client:", error);
      res.status(500).json({ message: "Failed to register client" });
    }
  });

  // Training plan routes
  app.post('/api/training-plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trainer = await storage.getTrainerByUserId(userId);
      if (!trainer) {
        return res.status(403).json({ message: "Only trainers can create plans" });
      }
      
      const { planExercises, ...planData } = req.body;
      
      // Add trainerId to planData before schema validation
      const planDataWithTrainer = {
        ...planData,
        trainerId: trainer.id,
      };
      
      // Create the training plan first
      const plan = await storage.createTrainingPlan(
        insertTrainingPlanSchema.parse(planDataWithTrainer)
      );
      
      // Create the plan exercises if provided
      if (planExercises && planExercises.length > 0) {
        await storage.createPlanExercises(plan.id, planExercises);
      }
      
      res.status(201).json(plan);
    } catch (error) {
      console.error("Error creating training plan:", error);
      res.status(500).json({ message: "Failed to create training plan" });
    }
  });

  app.get('/api/training-plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if user is trainer
      const trainer = await storage.getTrainerByUserId(userId);
      if (trainer) {
        const plans = await storage.getTrainingPlansByTrainer(trainer.id);
        return res.json(plans);
      }
      
      // Check if user is client
      const client = await storage.getClientByUserId(userId);
      if (client) {
        const assignedPlans = await storage.getClientPlans(client.id);
        const planIds = assignedPlans.map((cp: any) => cp.planId);
        
        if (planIds.length === 0) {
          return res.json([]);
        }
        
        // Get full plan details for assigned plans
        const plans = [];
        for (const planId of planIds) {
          const plan = await storage.getTrainingPlan(planId);
          if (plan) {
            const clientPlan = assignedPlans.find((cp: any) => cp.planId === planId);
            plans.push({
              ...plan,
              assignedDate: clientPlan.startDate,
              endDate: clientPlan.endDate,
              isActive: clientPlan.isActive
            });
          }
        }
        
        return res.json(plans);
      }
      
      return res.status(403).json({ message: "Access denied" });
    } catch (error) {
      console.error("Error fetching training plans:", error);
      res.status(500).json({ message: "Failed to fetch training plans" });
    }
  });

  // Get single training plan by ID (accessible by both trainers and clients)
  app.get('/api/training-plans/:planId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { planId } = req.params;
      const plan = await storage.getTrainingPlan(planId);
      
      if (!plan) {
        return res.status(404).json({ message: "Training plan not found" });
      }

      // Check access: trainers can view their own plans, clients can view assigned plans
      let hasAccess = false;
      
      // Check if user is trainer who owns the plan
      const trainer = await storage.getTrainerByUserId(userId);
      if (trainer && plan.trainerId === trainer.id) {
        hasAccess = true;
      }
      
      // Check if user is client who has this plan assigned
      if (!hasAccess) {
        const client = await storage.getClientByUserId(userId);
        if (client) {
          const assignedPlans = await storage.getClientPlans(client.id);
          hasAccess = assignedPlans.some((cp: any) => cp.planId === planId);
        }
      }
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get plan exercises
      const planExercises = await storage.getPlanExercisesByPlan(planId);
      
      res.json({
        ...plan,
        planExercises: planExercises
      });
    } catch (error) {
      console.error("Error fetching training plan:", error);
      res.status(500).json({ message: "Failed to fetch training plan" });
    }
  });

  // Client-specific endpoints
  app.get('/api/client/assigned-plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const client = await storage.getClientByUserId(userId);
      if (!client) {
        return res.status(403).json({ message: "Only clients can access this endpoint" });
      }
      
      const assignedPlans = await storage.getClientPlans(client.id);
      
      // Enrich with training plan details and calculate sessions per week
      const enrichedPlans = await Promise.all(assignedPlans.map(async (clientPlan: any) => {
        // Get the actual training plan details
        const trainingPlan = await storage.getTrainingPlan(clientPlan.planId);
        const planExercises = await storage.getPlanExercisesByPlan(clientPlan.planId);
        
        // Count unique days of the week that have exercises
        const uniqueDays = new Set(planExercises.map((ex: any) => ex.dayOfWeek));
        const sessionsPerWeek = uniqueDays.size;
        
        return {
          ...clientPlan,
          // Training plan details
          name: trainingPlan?.name || 'Unknown Plan',
          goal: trainingPlan?.goal || '',
          duration: trainingPlan?.duration || 0,
          weekCycle: trainingPlan?.weekCycle || 1,
          // Calculated data
          sessionsPerWeek
        };
      }));
      
      res.json(enrichedPlans);
    } catch (error) {
      console.error("Error fetching assigned plans:", error);
      res.status(500).json({ message: "Failed to fetch assigned plans" });
    }
  });

  app.get('/api/client/payment-plan', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const client = await storage.getClientByUserId(userId);
      if (!client) {
        return res.status(403).json({ message: "Only clients can access this endpoint" });
      }
      
      if (!client.clientPaymentPlanId) {
        return res.json(null);
      }
      
      const paymentPlan = await storage.getClientPaymentPlan(client.clientPaymentPlanId);
      res.json(paymentPlan);
    } catch (error) {
      console.error("Error fetching client payment plan:", error);
      res.status(500).json({ message: "Failed to fetch payment plan" });
    }
  });

  // Client profile endpoint
  app.get('/api/client/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const client = await storage.getClientByUserId(userId);
      if (!client) {
        return res.status(403).json({ message: "Only clients can access this endpoint" });
      }
      
      // Get user details
      const user = await storage.getUser(userId);
      
      // Get trainer details if assigned
      let trainer = null;
      if (client.trainerId) {
        trainer = await storage.getTrainer(client.trainerId);
      }
      
      res.json({
        ...client,
        ...user,
        trainer
      });
    } catch (error) {
      console.error("Error fetching client profile:", error);
      res.status(500).json({ message: "Failed to fetch client profile" });
    }
  });

  // Update client profile endpoint
  app.put('/api/client/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const client = await storage.getClientByUserId(userId);
      if (!client) {
        return res.status(403).json({ message: "Only clients can access this endpoint" });
      }
      
      const {
        firstName,
        lastName,
        phone,
        dateOfBirth,
        goals,
        currentWeight,
        targetWeight,
        height,
        activityLevel,
        medicalConditions,
        dietaryRestrictions,
        referralSource
      } = req.body;
      
      // Update user information
      if (firstName || lastName) {
        await storage.updateUser(userId, {
          firstName,
          lastName
        });
      }
      
      // Update client information
      await storage.updateClient(client.id, {
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        goals,
        currentWeight,
        targetWeight,
        height,
        activityLevel,
        medicalConditions,
        dietaryRestrictions,
        referralSource
      });
      
      // Return updated profile
      const updatedUser = await storage.getUser(userId);
      const updatedClient = await storage.getClientByUserId(userId);
      
      res.json({
        ...updatedClient,
        ...updatedUser
      });
    } catch (error) {
      console.error("Error updating client profile:", error);
      res.status(500).json({ message: "Failed to update client profile" });
    }
  });

  app.get('/api/client/today-workout', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const client = await storage.getClientByUserId(userId);
      if (!client) {
        return res.status(403).json({ message: "Only clients can access this endpoint" });
      }
      
      // Get active assigned plan
      const assignedPlans = await storage.getClientPlans(client.id);
      const activePlan = assignedPlans.find((cp: any) => cp.isActive);
      
      if (!activePlan) {
        return res.json({ workout: null, message: "No active training plan assigned" });
      }
      
      // Calculate which day and week of the plan the client is on
      if (!activePlan.startDate) {
        return res.json({ workout: null, message: "Training plan start date not set" });
      }
      
      const startDate = new Date(activePlan.startDate);
      const today = new Date();
      const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const weeksSinceStart = Math.floor(daysSinceStart / 7);
      
      // Get current day of the week (1 = Monday, 7 = Sunday)
      const currentDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const dayOfWeek = currentDayOfWeek === 0 ? 7 : currentDayOfWeek; // Convert to 1-7 where 1 = Monday
      
      // Get plan details
      const plan = await storage.getTrainingPlan(activePlan.planId);
      if (!plan) {
        return res.json({ workout: null, message: "Training plan not found" });
      }
      
      // Calculate current week in the cycle (1-based)
      const currentWeekInCycle = (weeksSinceStart % (plan.weekCycle || 1)) + 1;
      
      // Get all plan exercises and filter for today
      const planExercises = await storage.getPlanExercisesByPlan(activePlan.planId);
      
      // Filter exercises for today's day of week and current week in cycle
      const todayExercises = planExercises.filter((ex: any) => 
        ex.dayOfWeek === dayOfWeek && ex.week === currentWeekInCycle
      );
      
      // If no exercises for today, return appropriate message
      if (todayExercises.length === 0) {
        return res.json({
          workout: {
            planName: plan.name,
            dayOfWeek: dayOfWeek,
            week: currentWeekInCycle,
            exercises: []
          },
          planDetails: plan,
          message: "No workout scheduled for today"
        });
      }
      
      // Get exercise details for each plan exercise
      const exerciseDetails = await Promise.all(
        todayExercises.map(async (planEx: any) => {
          const exercise = await storage.getExercise(planEx.exerciseId);
          return {
            id: planEx.id,
            exercise: exercise,
            sets: planEx.sets,
            reps: planEx.reps,
            weight: planEx.weight,
            duration: planEx.duration,
            restTime: planEx.restTime,
            notes: planEx.notes
          };
        })
      );
      
      res.json({
        workout: {
          planName: plan.name,
          dayOfWeek: dayOfWeek,
          week: currentWeekInCycle,
          exercises: exerciseDetails
        },
        planDetails: plan
      });
    } catch (error) {
      console.error("Error fetching today's workout:", error);
      res.status(500).json({ message: "Failed to fetch today's workout" });
    }
  });

  // Workout completion endpoints
  app.post('/api/client/complete-exercise', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const client = await storage.getClientByUserId(userId);
      if (!client) {
        return res.status(403).json({ message: "Only clients can complete exercises" });
      }

      const { planExerciseId, completedSets, completedReps, actualWeight, actualDuration, notes, date } = req.body;
      
      const workoutLog = await storage.createWorkoutLog({
        clientId: client.id,
        planExerciseId,
        completedSets: completedSets || null,
        completedReps: completedReps || null,
        actualWeight: actualWeight || null,
        actualDuration: actualDuration || null,
        notes: notes || null,
        completedAt: date ? new Date(date) : new Date()  // Use provided date or default to now
      });

      res.status(201).json(workoutLog);
    } catch (error) {
      console.error("Error logging exercise completion:", error);
      res.status(500).json({ message: "Failed to log exercise completion" });
    }
  });

  app.get('/api/client/workout-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const client = await storage.getClientByUserId(userId);
      if (!client) {
        return res.status(403).json({ message: "Only clients can view workout logs" });
      }

      console.log(`[DEBUG] Fetching workout logs for client ID: ${client.id}, user ID: ${userId}`);

      const { date, planExerciseId } = req.query;
      let workoutLogs;

      if (planExerciseId) {
        // Get logs for specific exercise
        workoutLogs = await storage.getWorkoutLogsByExercise(client.id, planExerciseId as string);
      } else if (date) {
        // Get logs for specific date
        const targetDate = new Date(date as string);
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
        console.log(`[DEBUG] Querying for date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);
        workoutLogs = await storage.getWorkoutLogsByDateRange(client.id, startOfDay, endOfDay);
        console.log(`[DEBUG] Found ${workoutLogs.length} workout logs for client ${client.id}`);
      } else {
        // Get all logs for client
        workoutLogs = await storage.getWorkoutLogsByClient(client.id);
      }

      res.json(workoutLogs);
    } catch (error) {
      console.error("Error fetching workout logs:", error);
      res.status(500).json({ message: "Failed to fetch workout logs" });
    }
  });

  // Workout by date endpoint for Daily Workout page
  app.get('/api/client/workout-by-date', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const client = await storage.getClientByUserId(userId);
      if (!client) {
        return res.status(403).json({ message: "Only clients can access workout data" });
      }

      const { date } = req.query;
      if (!date) {
        return res.status(400).json({ message: "Date parameter is required" });
      }

      const targetDate = new Date(date as string);
      const activeClientPlan = await storage.getActiveClientPlan(client.id);
      
      if (!activeClientPlan) {
        return res.json({
          workout: null,
          planDetails: null,
          message: "No active training plan assigned"
        });
      }

      const plan = await storage.getTrainingPlan(activeClientPlan.planId);
      if (!plan) {
        return res.json({
          workout: null,
          planDetails: null,
          message: "Training plan not found"
        });
      }

      const planStartDate = new Date(activeClientPlan.startDate);
      const daysDiff = Math.floor((targetDate.getTime() - planStartDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff < 0) {
        return res.json({
          workout: null,
          planDetails: plan,
          message: "Training plan hasn't started yet"
        });
      }

      const currentWeekInCycle = Math.floor(daysDiff / 7) % plan.weekCycle + 1;
      const dayOfWeek = (targetDate.getDay() === 0 ? 7 : targetDate.getDay());
      
      const planExercises = await storage.getPlanExercisesByPlan(plan.id);
      const targetExercises = planExercises.filter(pe => 
        pe.dayOfWeek === dayOfWeek && pe.week === currentWeekInCycle
      );
      
      if (targetExercises.length === 0) {
        return res.json({
          workout: null,
          planDetails: plan,
          message: "No workout scheduled for this date"
        });
      }

      const exerciseDetails = await Promise.all(
        targetExercises.map(async (planEx: any) => {
          const exercise = await storage.getExercise(planEx.exerciseId);
          return {
            id: planEx.id,
            exercise: exercise,
            sets: planEx.sets,
            reps: planEx.reps,
            weight: planEx.weight,
            duration: planEx.duration,
            restTime: planEx.restTime,
            notes: planEx.notes
          };
        })
      );

      res.json({
        workout: {
          planName: plan.name,
          dayOfWeek: dayOfWeek,
          week: currentWeekInCycle,
          exercises: exerciseDetails
        },
        planDetails: plan
      });
    } catch (error) {
      console.error("Error fetching workout by date:", error);
      res.status(500).json({ message: "Failed to fetch workout data" });
    }
  });

  // Complete individual set endpoint
  app.post('/api/client/complete-set', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const client = await storage.getClientByUserId(userId);
      if (!client) {
        return res.status(403).json({ message: "Only clients can complete sets" });
      }

      const { planExerciseId, setNumber, actualReps, actualWeight, notes, date } = req.body;
      console.log(`[DEBUG] Complete set request:`, { planExerciseId, setNumber, actualReps, actualWeight, notes, date });
      
      // Check if this set was already completed for the target date
      const targetDate = date ? new Date(date) : new Date();
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      
      const existingLogs = await storage.getWorkoutLogsByDateRange(client.id, startOfDay, endOfDay);
      const existingSet = existingLogs.find(log => 
        log.planExerciseId === planExerciseId && log.setNumber === setNumber
      );
      
      if (existingSet) {
        return res.status(400).json({ message: "Set already completed for this date" });
      }

      const workoutLog = await storage.createWorkoutLog({
        clientId: client.id,
        planExerciseId,
        setNumber,
        completedSets: 1,
        completedReps: actualReps || null,
        actualWeight: actualWeight || null,
        actualDuration: null,
        notes: notes || null,
        completedAt: targetDate  // Use the target date instead of now
      });

      res.status(201).json(workoutLog);
    } catch (error) {
      console.error("Error logging set completion:", error);
      res.status(500).json({ message: "Failed to log set completion" });
    }
  });

  // Uncheck/delete individual set endpoint
  app.delete('/api/client/uncheck-set', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const client = await storage.getClientByUserId(userId);
      if (!client) {
        return res.status(403).json({ message: "Only clients can uncheck sets" });
      }

      const { planExerciseId, setNumber, date } = req.body;
      
      // Find the specific set log to delete
      const targetDate = date ? new Date(date) : new Date();
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      
      const existingLogs = await storage.getWorkoutLogsByDateRange(client.id, startOfDay, endOfDay);
      const setToDelete = existingLogs.find(log => 
        log.planExerciseId === planExerciseId && log.setNumber === setNumber
      );
      
      if (!setToDelete) {
        return res.status(404).json({ message: "Set not found" });
      }

      await storage.deleteWorkoutLog(setToDelete.id);
      res.status(200).json({ message: "Set unchecked successfully" });
    } catch (error) {
      console.error("Error unchecking set:", error);
      res.status(500).json({ message: "Failed to uncheck set" });
    }
  });

  // Save exercise notes independently endpoint - saves to set 1
  app.post('/api/client/save-exercise-notes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const client = await storage.getClientByUserId(userId);
      if (!client) {
        return res.status(403).json({ message: "Only clients can save exercise notes" });
      }

      const { planExerciseId, notes, date } = req.body;
      console.log(`[DEBUG] Save notes request:`, { planExerciseId, notes, date });
      
      if (!notes || !notes.trim()) {
        return res.status(400).json({ message: "Notes cannot be empty" });
      }

      // Use the provided date or default to today
      const targetDate = date ? new Date(date) : new Date();
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      
      // Check if set 1 already exists for this exercise on this date
      const existingLogs = await storage.getWorkoutLogsByDateRange(client.id, startOfDay, endOfDay);
      const existingSet1 = existingLogs.find(log => 
        log.planExerciseId === planExerciseId && log.setNumber === 1
      );
      
      if (existingSet1) {
        // Update existing set 1 with new notes
        const updatedLog = await storage.updateWorkoutLog(existingSet1.id, {
          notes: notes.trim()
        });
        res.status(200).json({ 
          message: "Notes updated successfully",
          workoutLog: updatedLog
        });
      } else {
        // Create set 1 with notes (but not marked as completed)
        const workoutLog = await storage.createWorkoutLog({
          clientId: client.id,
          planExerciseId,
          completedSets: null, // Not completed, just has notes
          completedReps: null,
          setNumber: 1,
          actualWeight: null,
          actualDuration: null,
          notes: notes.trim(),
          completedAt: targetDate
        });
        res.status(201).json({ 
          message: "Notes saved successfully",
          workoutLog
        });
      }
    } catch (error) {
      console.error("Error saving exercise notes:", error);
      res.status(500).json({ message: "Failed to save exercise notes" });
    }
  });

  // Get weekly workout stats endpoint
  app.get('/api/client/weekly-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const client = await storage.getClientByUserId(userId);
      if (!client) {
        return res.status(403).json({ message: "Only clients can view workout stats" });
      }

      // Get start of current week (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - daysToMonday);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      // Get workout logs for this week
      const weeklyLogs = await storage.getWorkoutLogsByDateRange(client.id, startOfWeek, endOfWeek);
      
      // Group by date and exercise to count completed workouts
      const workoutsByDate = new Map();
      weeklyLogs.forEach(log => {
        if (log.setNumber && log.setNumber > 0) {
          const dateKey = log.completedAt.toDateString();
          if (!workoutsByDate.has(dateKey)) {
            workoutsByDate.set(dateKey, new Set());
          }
          workoutsByDate.get(dateKey).add(log.planExerciseId);
        }
      });

      const completedWorkoutDays = workoutsByDate.size;

      // Get client's active plan to determine sessions per week
      const activeClientPlan = await storage.getActiveClientPlan(client.id);
      let totalWorkoutsPerWeek = 0;
      
      if (activeClientPlan) {
        const trainingPlan = await storage.getTrainingPlan(activeClientPlan.planId);
        if (trainingPlan) {
          // Count unique workout days from plan exercises
          const planExercises = await storage.getPlanExercisesByPlan(trainingPlan.id);
          const uniqueDays = new Set(planExercises.map(pe => pe.dayOfWeek));
          totalWorkoutsPerWeek = uniqueDays.size;
        }
      }

      res.json({
        completedWorkouts: completedWorkoutDays,
        totalWorkouts: totalWorkoutsPerWeek
      });
    } catch (error) {
      console.error("Error fetching weekly stats:", error);
      res.status(500).json({ message: "Failed to fetch weekly stats" });
    }
  });

  // Get workout streak endpoint
  app.get('/api/client/workout-streak', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const client = await storage.getClientByUserId(userId);
      if (!client) {
        return res.status(403).json({ message: "Only clients can view workout streak" });
      }

      // Get all workout logs ordered by date descending
      const allLogs = await storage.getWorkoutLogsByClient(client.id);
      
      // Group by date to see which days had workouts
      const workoutDates = new Set();
      allLogs.forEach(log => {
        if (log.setNumber && log.setNumber > 0) {
          const dateKey = log.completedAt.toDateString();
          workoutDates.add(dateKey);
        }
      });

      // Convert to sorted array of dates (most recent first)
      const sortedWorkoutDates = Array.from(workoutDates)
        .map(dateStr => new Date(dateStr))
        .sort((a, b) => b.getTime() - a.getTime());

      if (sortedWorkoutDates.length === 0) {
        return res.json({ streak: 0 });
      }

      // Calculate streak counting backward from today
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Check if there was a workout today or yesterday (to allow for flexibility)
      const mostRecentWorkout = sortedWorkoutDates[0];
      const daysSinceLastWorkout = Math.floor((today.getTime() - mostRecentWorkout.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastWorkout <= 1) {
        // Start counting streak
        let currentDate = new Date(mostRecentWorkout);
        
        for (const workoutDate of sortedWorkoutDates) {
          const daysDiff = Math.floor((currentDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff <= 1) { // Allow 1 day gap for rest days
            streak++;
            currentDate = new Date(workoutDate);
          } else {
            break;
          }
        }
      }

      res.json({ streak });
    } catch (error) {
      console.error("Error fetching workout streak:", error);
      res.status(500).json({ message: "Failed to fetch workout streak" });
    }
  });

  // Complete entire exercise endpoint
  app.post('/api/client/complete-exercise-all-sets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const client = await storage.getClientByUserId(userId);
      if (!client) {
        return res.status(403).json({ message: "Only clients can complete exercises" });
      }

      console.log(`[DEBUG] Completing exercise for client ID: ${client.id}, user ID: ${userId}`);
      console.log(`[DEBUG] Request body:`, { planExerciseId, totalSets, actualWeight, actualReps, actualDuration, notes: req.body.notes, date: req.body.date });

      const { planExerciseId, totalSets, actualWeight, actualReps, actualDuration, notes, date } = req.body;
      
      // Use the provided date or default to today
      const targetDate = date ? new Date(date) : new Date();
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      
      console.log(`[DEBUG] Creating workout logs for date: ${targetDate.toISOString().split('T')[0]}`);
      
      // Get existing workout logs for this exercise today to see which sets are already completed
      const existingLogs = await storage.getWorkoutLogsByDateRange(client.id, startOfDay, endOfDay);
      const exerciseLogs = existingLogs.filter(log => log.planExerciseId === planExerciseId);
      
      const completedSetNumbers = new Set(
        exerciseLogs
          .filter(log => log.setNumber != null && log.setNumber > 0)
          .map(log => log.setNumber)
      );

      // Create workout log entries for all remaining sets
      const workoutLogs = [];
      for (let setNumber = 1; setNumber <= totalSets; setNumber++) {
        if (!completedSetNumbers.has(setNumber)) {
          const workoutLog = await storage.createWorkoutLog({
            clientId: client.id,
            planExerciseId,
            completedSets: 1,
            completedReps: actualReps || null,
            setNumber,
            actualWeight: actualWeight || null,
            actualDuration: actualDuration || null,
            notes: notes || null,
            completedAt: targetDate  // Use the target date instead of now
          });
          workoutLogs.push(workoutLog);
        }
      }

      res.status(201).json({ 
        message: "Exercise completed successfully", 
        completedSets: workoutLogs.length,
        totalSets,
        workoutLogs
      });
    } catch (error) {
      console.error("Error completing exercise:", error);
      res.status(500).json({ message: "Failed to complete exercise" });
    }
  });

  // Exercise routes
  app.post('/api/exercises', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trainer = await storage.getTrainerByUserId(userId);
      if (!trainer) {
        return res.status(403).json({ message: "Only trainers can create exercises" });
      }
      
      const exerciseData = insertExerciseSchema.parse({
        ...req.body,
        trainerId: trainer.id,
      });
      const exercise = await storage.createExercise(exerciseData);
      
      res.status(201).json(exercise);
    } catch (error) {
      console.error("Error creating exercise:", error);
      res.status(500).json({ message: "Failed to create exercise" });
    }
  });

  app.get('/api/exercises', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if user is trainer
      const trainer = await storage.getTrainerByUserId(userId);
      if (trainer) {
        const exercises = await storage.getExercisesByTrainer(trainer.id);
        return res.json(exercises);
      }
      
      // Check if user is client - they can view all exercises for training plan details
      const client = await storage.getClientByUserId(userId);
      if (client) {
        // For clients, get exercises from their trainer
        const clientData = await storage.getClient(client.id);
        if (!clientData || !clientData.trainerId) {
          return res.json([]);
        }
        const exercises = await storage.getExercisesByTrainer(clientData.trainerId);
        return res.json(exercises);
      }
      
      return res.status(403).json({ message: "Access denied" });
    } catch (error) {
      console.error("Error fetching exercises:", error);
      res.status(500).json({ message: "Failed to fetch exercises" });
    }
  });

  app.put('/api/exercises/:id/media', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!req.body.mediaURL) {
        return res.status(400).json({ error: "mediaURL is required" });
      }

      const trainer = await storage.getTrainerByUserId(userId);
      if (!trainer) {
        return res.status(403).json({ message: "Only trainers can update exercises" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.mediaURL,
        {
          owner: userId,
          visibility: "public", // Exercise media should be publicly accessible
        },
      );

      await storage.updateExercise(req.params.id, {
        mediaUrl: objectPath,
        mediaType: req.body.mediaType || 'image',
      });

      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error updating exercise media:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Endpoint for setting ACL policy on evaluation photos
  app.put('/api/evaluation-photos', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!req.body.photoURL) {
        return res.status(400).json({ error: "photoURL is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.photoURL,
        {
          owner: userId,
          visibility: "public", // Make evaluation photos public like exercises
        },
      );

      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error setting evaluation photo ACL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Client plan assignment routes
  app.post('/api/client-plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trainer = await storage.getTrainerByUserId(userId);
      
      if (!trainer) {
        return res.status(403).json({ message: "Only trainers can assign plans" });
      }

      const { planId, clientId, startDate, endDate, isActive } = req.body;
      
      if (!planId || !clientId || !startDate || !endDate) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Verify the plan belongs to this trainer
      const plan = await storage.getTrainingPlan(planId);
      if (!plan || plan.trainerId !== trainer.id) {
        return res.status(403).json({ message: "Plan not found or access denied" });
      }

      // Verify the client belongs to this trainer
      const client = await storage.getClientById(clientId);
      if (!client || client.trainerId !== trainer.id) {
        return res.status(403).json({ message: "Client not found or access denied" });
      }

      const clientPlan = await storage.assignPlanToClient({
        planId,
        clientId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: isActive || true,
      });

      res.status(201).json(clientPlan);
    } catch (error) {
      console.error("Error assigning plan to client:", error);
      res.status(500).json({ message: "Failed to assign plan to client" });
    }
  });

  // Get client plans (assigned training plans for a client)
  app.get('/api/client-plans/:clientId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trainer = await storage.getTrainerByUserId(userId);
      
      if (!trainer) {
        return res.status(403).json({ message: "Only trainers can view client plans" });
      }

      const { clientId } = req.params;
      
      // Verify the client belongs to this trainer
      const client = await storage.getClientById(clientId);
      if (!client || client.trainerId !== trainer.id) {
        return res.status(403).json({ message: "Client not found or access denied" });
      }

      const clientPlans = await storage.getClientPlans(clientId);
      
      // Get full plan details for each assigned plan
      const plansWithDetails = await Promise.all(
        clientPlans.map(async (clientPlan) => {
          const plan = await storage.getTrainingPlan(clientPlan.planId);
          return {
            ...clientPlan,
            plan: plan
          };
        })
      );

      res.json(plansWithDetails);
    } catch (error) {
      console.error("Error fetching client plans:", error);
      res.status(500).json({ message: "Failed to fetch client plans" });
    }
  });

  // Monthly evaluation routes
  app.post('/api/evaluations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const client = await storage.getClientByUserId(userId);
      if (!client) {
        return res.status(403).json({ message: "Only clients can submit evaluations" });
      }
      
      const evaluationData = insertMonthlyEvaluationSchema.parse(req.body);
      const evaluation = await storage.createMonthlyEvaluation({
        ...evaluationData,
        clientId: client.id,
      });

      // Update the client's current weight with the new weight from evaluation
      if (evaluationData.weight) {
        await storage.updateClient(client.id, {
          currentWeight: evaluationData.weight,
        });
      }
      
      res.status(201).json(evaluation);
    } catch (error) {
      console.error("Error creating evaluation:", error);
      res.status(500).json({ message: "Failed to create evaluation" });
    }
  });

  // Get individual evaluation by ID
  app.get('/api/evaluations/:evaluationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { evaluationId } = req.params;

      const evaluation = await storage.getMonthlyEvaluation(evaluationId);
      if (!evaluation) {
        return res.status(404).json({ message: "Evaluation not found" });
      }

      // Check if user is a trainer accessing client evaluations
      const trainer = await storage.getTrainerByUserId(userId);
      if (trainer) {
        // Verify the client belongs to this trainer
        const client = await storage.getClientById(evaluation.clientId);
        if (!client || client.trainerId !== trainer.id) {
          return res.status(403).json({ message: "Client not found or access denied" });
        }
        
        return res.json(evaluation);
      }

      // Check if user is a client accessing their own evaluation
      const client = await storage.getClientByUserId(userId);
      if (client && evaluation.clientId === client.id) {
        return res.json(evaluation);
      }

      return res.status(403).json({ message: "Access denied" });
    } catch (error) {
      console.error("Error fetching evaluation:", error);
      res.status(500).json({ message: "Failed to fetch evaluation" });
    }
  });

  app.get('/api/evaluations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { clientId } = req.query;

      // Check if user is a trainer accessing client evaluations
      if (clientId) {
        const trainer = await storage.getTrainerByUserId(userId);
        if (trainer) {
          // Verify the client belongs to this trainer
          const client = await storage.getClientById(clientId);
          if (!client || client.trainerId !== trainer.id) {
            return res.status(403).json({ message: "Client not found or access denied" });
          }
          
          const evaluations = await storage.getMonthlyEvaluationsByClient(clientId);
          return res.json(evaluations);
        }
      }

      // Default behavior for clients viewing their own evaluations
      const client = await storage.getClientByUserId(userId);
      if (!client) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const evaluations = await storage.getMonthlyEvaluationsByClient(client.id);
      res.json(evaluations);
    } catch (error) {
      console.error("Error fetching evaluations:", error);
      res.status(500).json({ message: "Failed to fetch evaluations" });
    }
  });

  // Chat routes
  app.get('/api/chat/users', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(currentUserId);
      
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get all users and filter based on role
      const allUsers = await storage.getAllUsers();
      
      const chatUsers = allUsers
        .filter((user: User) => user.id !== currentUserId) // Exclude current user
        .map((user: User) => ({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profileImageUrl: user.profileImageUrl,
          role: user.role,
        }));
      
      res.json(chatUsers);
    } catch (error) {
      console.error("Error fetching chat users:", error);
      res.status(500).json({ message: "Failed to fetch chat users" });
    }
  });

  app.get('/api/chat/messages/:receiverId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messages = await storage.getChatMessages(userId, req.params.receiverId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  app.post('/api/chat/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      console.log('Creating chat message:', { userId, body: req.body });
      
      const { receiverId, message } = req.body;
      if (!receiverId || !message) {
        return res.status(400).json({ message: "receiverId and message are required" });
      }

      // Authorization check for trainers
      if (user?.role === 'trainer') {
        const trainer = await storage.getTrainerByUserId(userId);
        if (!trainer) {
          return res.status(403).json({ message: "Trainer not found" });
        }

        const canChat = await storage.canTrainerChatWithUser(trainer.id, receiverId);
        if (!canChat) {
          return res.status(403).json({ message: "You can only chat with your clients and superadmin" });
        }
      }

      // Authorization check for clients
      if (user?.role === 'client') {
        const client = await storage.getClientByUserId(userId);
        const receiverUser = await storage.getUser(receiverId);
        
        if (!client || !receiverUser) {
          return res.status(403).json({ message: "Invalid chat participants" });
        }

        if (receiverUser.role === 'superadmin') {
          // Allow chat with superadmin
        } else if (receiverUser.role === 'trainer') {
          const receiverTrainer = await storage.getTrainerByUserId(receiverId);
          if (!receiverTrainer || client.trainerId !== receiverTrainer.id) {
            return res.status(403).json({ message: "You can only chat with your assigned trainer and superadmin" });
          }
        } else {
          return res.status(403).json({ message: "You can only chat with your assigned trainer and superadmin" });
        }
      }
      
      const messageData = insertChatMessageSchema.parse({
        senderId: userId,
        receiverId,
        message,
      });
      
      console.log('Parsed message data:', messageData);
      const chatMessage = await storage.createChatMessage(messageData);
      console.log('Created message:', chatMessage);
      
      // Broadcast to WebSocket clients
      console.log('Broadcasting to', wss.clients.size, 'WebSocket clients');
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'new_message',
            data: chatMessage,
          }));
        }
      });
      
      res.status(201).json(chatMessage);
    } catch (error) {
      console.error("Error creating chat message:", error);
      res.status(500).json({ message: "Failed to create chat message" });
    }
  });

  // Admin routes
  app.get('/api/admin/stats', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'superadmin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get('/api/admin/pending-trainers', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'superadmin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const trainers = await storage.getPendingTrainers();
      res.json(trainers);
    } catch (error) {
      console.error("Error fetching pending trainers:", error);
      res.status(500).json({ message: "Failed to fetch pending trainers" });
    }
  });

  // Get approved trainers for admin
  app.get('/api/admin/approved-trainers', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'superadmin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const trainers = await storage.getApprovedTrainers();
      res.json(trainers);
    } catch (error) {
      console.error("Error fetching approved trainers:", error);
      res.status(500).json({ message: "Failed to fetch approved trainers" });
    }
  });

  // Approve trainer
  app.post('/api/admin/approve-trainer/:trainerId', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'superadmin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { trainerId } = req.params;
      console.log('Approving trainer with ID:', trainerId);
      
      await storage.approveTrainer(trainerId);
      console.log('Trainer approved successfully:', trainerId);
      
      res.json({ success: true, message: "Trainer approved successfully" });
    } catch (error) {
      console.error("Error approving trainer:", error);
      console.error("Error details:", (error as Error).message, (error as Error).stack);
      res.status(500).json({ message: "Failed to approve trainer. Please try again." });
    }
  });

  // Reject trainer
  app.post('/api/admin/reject-trainer/:trainerId', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'superadmin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { trainerId } = req.params;
      await storage.rejectTrainer(trainerId);
      res.json({ success: true, message: "Trainer rejected successfully" });
    } catch (error) {
      console.error("Error rejecting trainer:", error);
      res.status(500).json({ message: "Failed to reject trainer" });
    }
  });

  // Suspend trainer
  app.post('/api/admin/suspend-trainer/:trainerId', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'superadmin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { trainerId } = req.params;
      await storage.suspendTrainer(trainerId);
      res.json({ success: true, message: "Trainer suspended successfully" });
    } catch (error) {
      console.error("Error suspending trainer:", error);
      res.status(500).json({ message: "Failed to suspend trainer" });
    }
  });

  // Get all trainers with details for admin management
  app.get('/api/admin/trainers', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'superadmin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const trainersWithDetails = await storage.getTrainersWithDetails();
      res.json(trainersWithDetails);
    } catch (error) {
      console.error("Error fetching trainers with details:", error);
      res.status(500).json({ message: "Failed to fetch trainers" });
    }
  });

  // Update trainer payment plan (SuperAdmin only)
  app.put('/api/admin/trainers/:trainerId/payment-plan', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'superadmin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { trainerId } = req.params;
      const { paymentPlanId } = req.body;

      await storage.updateTrainerPaymentPlan(trainerId, paymentPlanId);
      res.json({ success: true, message: "Payment plan updated successfully" });
    } catch (error) {
      console.error("Error updating trainer payment plan:", error);
      res.status(500).json({ message: "Failed to update payment plan" });
    }
  });

  // Update trainer status (SuperAdmin only)
  app.put('/api/admin/trainers/:trainerId/status', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'superadmin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { trainerId } = req.params;
      const { status } = req.body;

      await storage.updateTrainerStatus(trainerId, status);
      res.json({ success: true, message: "Trainer status updated successfully" });
    } catch (error) {
      console.error("Error updating trainer status:", error);
      res.status(500).json({ message: "Failed to update trainer status" });
    }
  });

  // Admin view all clients
  app.get('/api/admin/clients', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'superadmin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { trainer, search, status } = req.query;
      const clients = await storage.getAllClientsAdmin({ trainer, search, status });
      res.json(clients);
    } catch (error) {
      console.error("Error fetching admin clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  // Admin view all training plans
  app.get('/api/admin/training-plans', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'superadmin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { trainer, search } = req.query;
      const plans = await storage.getAllTrainingPlansAdmin({ trainer, search });
      res.json(plans);
    } catch (error) {
      console.error("Error fetching admin training plans:", error);
      res.status(500).json({ message: "Failed to fetch training plans" });
    }
  });

  // Payment Plans API routes
  app.get('/api/payment-plans', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'superadmin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const plans = await storage.getAllPaymentPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching payment plans:", error);
      res.status(500).json({ message: "Failed to fetch payment plans" });
    }
  });

  app.get('/api/payment-plans/active', async (req, res) => {
    try {
      const plans = await storage.getActivePaymentPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching active payment plans:", error);
      res.status(500).json({ message: "Failed to fetch active payment plans" });
    }
  });

  app.post('/api/payment-plans', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'superadmin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const planData = insertPaymentPlanSchema.parse(req.body);
      const plan = await storage.createPaymentPlan(planData);
      res.status(201).json(plan);
    } catch (error) {
      console.error("Error creating payment plan:", error);
      res.status(500).json({ message: "Failed to create payment plan" });
    }
  });

  app.put('/api/payment-plans/:planId', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'superadmin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { planId } = req.params;
      const planData = insertPaymentPlanSchema.partial().parse(req.body);
      const plan = await storage.updatePaymentPlan(planId, planData);
      res.json(plan);
    } catch (error) {
      console.error("Error updating payment plan:", error);
      res.status(500).json({ message: "Failed to update payment plan" });
    }
  });

  app.delete('/api/payment-plans/:planId', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'superadmin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { planId } = req.params;
      await storage.deletePaymentPlan(planId);
      res.json({ success: true, message: "Payment plan deleted successfully" });
    } catch (error) {
      console.error("Error deleting payment plan:", error);
      res.status(500).json({ message: "Failed to delete payment plan" });
    }
  });

  // Client payment plan routes (for trainers to manage client payment plans)
  app.get('/api/client-payment-plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trainer = await storage.getTrainerByUserId(userId);
      if (!trainer) {
        return res.status(403).json({ message: "Only trainers can access client payment plans" });
      }

      const plans = await storage.getClientPaymentPlansByTrainer(trainer.id);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching client payment plans:", error);
      res.status(500).json({ message: "Failed to fetch client payment plans" });
    }
  });

  // Get a specific client payment plan by ID
  app.get('/api/client-payment-plans/:planId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trainer = await storage.getTrainerByUserId(userId);
      if (!trainer) {
        return res.status(403).json({ message: "Only trainers can access client payment plans" });
      }

      const { planId } = req.params;
      const plan = await storage.getClientPaymentPlan(planId);
      
      if (!plan || plan.trainerId !== trainer.id) {
        return res.status(404).json({ message: "Client payment plan not found" });
      }

      res.json(plan);
    } catch (error) {
      console.error("Error fetching client payment plan:", error);
      res.status(500).json({ message: "Failed to fetch client payment plan" });
    }
  });

  app.post('/api/client-payment-plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trainer = await storage.getTrainerByUserId(userId);
      if (!trainer) {
        return res.status(403).json({ message: "Only trainers can create client payment plans" });
      }

      const planData = insertClientPaymentPlanSchema.parse({
        ...req.body,
        trainerId: trainer.id
      });
      const plan = await storage.createClientPaymentPlan(planData);
      res.status(201).json(plan);
    } catch (error) {
      console.error("Error creating client payment plan:", error);
      res.status(500).json({ message: "Failed to create client payment plan" });
    }
  });

  app.put('/api/client-payment-plans/:planId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trainer = await storage.getTrainerByUserId(userId);
      if (!trainer) {
        return res.status(403).json({ message: "Only trainers can update client payment plans" });
      }

      const { planId } = req.params;
      
      // Verify the plan belongs to this trainer
      const existingPlan = await storage.getClientPaymentPlan(planId);
      if (!existingPlan || existingPlan.trainerId !== trainer.id) {
        return res.status(404).json({ message: "Client payment plan not found" });
      }

      const planData = insertClientPaymentPlanSchema.partial().parse(req.body);
      const plan = await storage.updateClientPaymentPlan(planId, planData);
      res.json(plan);
    } catch (error) {
      console.error("Error updating client payment plan:", error);
      res.status(500).json({ message: "Failed to update client payment plan" });
    }
  });

  app.delete('/api/client-payment-plans/:planId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trainer = await storage.getTrainerByUserId(userId);
      if (!trainer) {
        return res.status(403).json({ message: "Only trainers can delete client payment plans" });
      }

      const { planId } = req.params;
      
      // Verify the plan belongs to this trainer
      const existingPlan = await storage.getClientPaymentPlan(planId);
      if (!existingPlan || existingPlan.trainerId !== trainer.id) {
        return res.status(404).json({ message: "Client payment plan not found" });
      }

      await storage.deleteClientPaymentPlan(planId);
      res.json({ success: true, message: "Client payment plan deleted successfully" });
    } catch (error) {
      console.error("Error deleting client payment plan:", error);
      res.status(500).json({ message: "Failed to delete client payment plan" });
    }
  });

  // Assign client payment plan to client
  app.put('/api/clients/:clientId/payment-plan', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trainer = await storage.getTrainerByUserId(userId);
      if (!trainer) {
        return res.status(403).json({ message: "Only trainers can assign client payment plans" });
      }

      const { clientId } = req.params;
      const { clientPaymentPlanId } = req.body;

      // Verify the client belongs to this trainer
      const client = await storage.getClient(clientId);
      if (!client || client.trainerId !== trainer.id) {
        return res.status(404).json({ message: "Client not found or not assigned to you" });
      }

      // If a payment plan is being assigned, verify it belongs to this trainer
      if (clientPaymentPlanId) {
        const paymentPlan = await storage.getClientPaymentPlan(clientPaymentPlanId);
        if (!paymentPlan || paymentPlan.trainerId !== trainer.id) {
          return res.status(400).json({ message: "Invalid payment plan" });
        }
      }

      await storage.assignClientPaymentPlan(clientId, clientPaymentPlanId || null);
      res.json({ success: true, message: "Client payment plan assigned successfully" });
    } catch (error) {
      console.error("Error assigning client payment plan:", error);
      res.status(500).json({ message: "Failed to assign client payment plan" });
    }
  });

  // Admin view all exercises
  app.get('/api/admin/exercises', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'superadmin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { trainer, search, category } = req.query;
      const exercises = await storage.getAllExercisesAdmin({ trainer, search, category });
      res.json(exercises);
    } catch (error) {
      console.error("Error fetching admin exercises:", error);
      res.status(500).json({ message: "Failed to fetch exercises" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: ExtendedWebSocket) => {
    console.log('New WebSocket connection');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'join_room') {
          // Handle user joining chat room
          ws.userId = data.userId;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });

  // Get individual client details for trainer
  app.get('/api/clients/:clientId', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'trainer') {
        return res.status(403).json({ message: "Trainer access required" });
      }

      const { clientId } = req.params;
      const client = await storage.getClientById(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Verify client belongs to this trainer
      const trainer = await storage.getTrainerByUserId(req.user.claims.sub);
      if (!trainer || client.trainerId !== trainer.id) {
        return res.status(403).json({ message: "Client not found" });
      }

      // Get user details for this client
      const clientUser = await storage.getUser(client.userId);
      
      // Combine client and user data
      const clientWithUserData = {
        ...client,
        user: clientUser,
        // Also include user fields directly for backward compatibility
        firstName: clientUser?.firstName,
        lastName: clientUser?.lastName,
        email: clientUser?.email,
        profileImageUrl: clientUser?.profileImageUrl
      };

      res.json(clientWithUserData);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  // Suspend client
  app.post('/api/clients/:clientId/suspend', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'trainer') {
        return res.status(403).json({ message: "Trainer access required" });
      }

      const { clientId } = req.params;
      const client = await storage.getClientById(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Verify client belongs to this trainer
      const trainer = await storage.getTrainerByUserId(req.user.claims.sub);
      if (!trainer || client.trainerId !== trainer.id) {
        return res.status(403).json({ message: "Client not found" });
      }

      await storage.suspendClient(clientId);
      res.json({ success: true, message: "Client suspended successfully" });
    } catch (error) {
      console.error("Error suspending client:", error);
      res.status(500).json({ message: "Failed to suspend client" });
    }
  });

  // Reactivate client
  app.post('/api/clients/:clientId/reactivate', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'trainer') {
        return res.status(403).json({ message: "Trainer access required" });
      }

      const { clientId } = req.params;
      const client = await storage.getClientById(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Verify client belongs to this trainer
      const trainer = await storage.getTrainerByUserId(req.user.claims.sub);
      if (!trainer || client.trainerId !== trainer.id) {
        return res.status(403).json({ message: "Client not found" });
      }

      await storage.reactivateClient(clientId);
      res.json({ success: true, message: "Client reactivated successfully" });
    } catch (error) {
      console.error("Error reactivating client:", error);
      res.status(500).json({ message: "Failed to reactivate client" });
    }
  });

  // Update client information
  // Update client payment plan
  app.put('/api/clients/:clientId/payment-plan', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'trainer') {
        return res.status(403).json({ message: "Trainer access required" });
      }

      const { clientId } = req.params;
      const { clientPaymentPlanId } = req.body;
      
      const client = await storage.getClientById(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Verify client belongs to this trainer
      const trainer = await storage.getTrainerByUserId(req.user.claims.sub);
      if (!trainer || client.trainerId !== trainer.id) {
        return res.status(403).json({ message: "Client not found" });
      }

      // If a payment plan is specified, verify it belongs to this trainer
      if (clientPaymentPlanId) {
        const paymentPlan = await storage.getClientPaymentPlan(clientPaymentPlanId);
        if (!paymentPlan || paymentPlan.trainerId !== trainer.id) {
          return res.status(400).json({ message: "Invalid payment plan" });
        }
      }

      const updatedClient = await storage.updateClient(clientId, { clientPaymentPlanId });
      res.json(updatedClient);
    } catch (error) {
      console.error("Error updating client payment plan:", error);
      res.status(500).json({ message: "Failed to update client payment plan" });
    }
  });

  app.put('/api/clients/:clientId', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'trainer') {
        return res.status(403).json({ message: "Trainer access required" });
      }

      const { clientId } = req.params;
      const client = await storage.getClientById(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Verify client belongs to this trainer
      const trainer = await storage.getTrainerByUserId(req.user.claims.sub);
      if (!trainer || client.trainerId !== trainer.id) {
        return res.status(403).json({ message: "Client not found" });
      }

      const updatedClient = await storage.updateClient(clientId, req.body);
      res.json(updatedClient);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  // DEV ONLY: Account switcher for testing
  app.post('/api/dev/switch-account', async (req, res) => {
    try {
      const { accountId } = req.body;
      if (!accountId) {
        return res.status(400).json({ message: "Account ID required" });
      }

      // Mock session switch by updating session user
      if (req.session && req.user) {
        req.user.claims = { ...req.user.claims, sub: accountId };
        req.session.passport = { user: req.user };
      }

      res.json({ success: true, message: "Account switched successfully" });
    } catch (error) {
      console.error("Error switching account:", error);
      res.status(500).json({ message: "Failed to switch account" });
    }
  });

  return httpServer;
}
