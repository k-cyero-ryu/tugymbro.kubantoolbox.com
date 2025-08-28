# My Body Trainer Manager

A comprehensive, multi-lingual web application that connects personal trainers with their clients. The platform enables trainers to manage client relationships, create customized training plans, track progress, and facilitate direct communication.

## 🚀 Features

- **Multi-Role System**: SuperAdmin, Trainer, and Client roles with role-based access control
- **Training Management**: Create and manage customized training plans and exercises
- **Progress Tracking**: Detailed progress monitoring and monthly evaluations
- **Real-time Communication**: WebSocket-based chat system
- **Multi-language Support**: English, Spanish, French, and Portuguese
- **Visual Intelligence**: T-pose photo analysis for body measurements
- **File Management**: Secure file upload and storage for exercise media
- **Responsive Design**: Mobile-friendly interface with modern UI components

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express.js + TypeScript
- **Database**: PostgreSQL (Neon Serverless)
- **ORM**: Drizzle ORM
- **Authentication**: Replit OIDC
- **File Storage**: Google Cloud Storage
- **UI Framework**: Tailwind CSS + shadcn/ui
- **State Management**: TanStack Query (React Query)
- **Real-time**: WebSocket (ws library)

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or cloud)
- Google Cloud Storage bucket
- Replit authentication setup (for Replit deployment)

## 🔧 Installation

### 1. Clone and Install Dependencies

```bash
git clone <your-repository-url>
cd my-body-trainer-manager

# Install dependencies from the root directory
npm install
```

**Important**: Run `npm install` from the **root directory** of the project, not from any subdirectory.

### 2. Database Setup

#### Option A: Using Neon Database (Recommended for Production)

1. Create a Neon database account at [neon.tech](https://neon.tech)
2. Create a new database project
3. Copy the connection string provided by Neon

#### Option B: Using Local PostgreSQL

1. Install PostgreSQL locally
2. Create a new database:
```sql
CREATE DATABASE my_body_trainer_manager;
CREATE USER your_username WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE my_body_trainer_manager TO your_username;
```

3. Your connection string will be:
```
postgresql://your_username:your_password@localhost:5432/my_body_trainer_manager
```

### 3. Environment Variables

Create a `.env` file in the **root directory** with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database_name

# For Production (replace with your actual database credentials):
# DATABASE_URL=postgresql://your_username:your_password@your_host:5432/your_database_name

# Session Configuration
SESSION_SECRET=your_super_secret_session_key_here

# Replit Authentication (required for Replit deployment)
REPLIT_DOMAINS=your-domain.replit.app
ISSUER_URL=https://replit.com/oidc
REPL_ID=your-repl-id

# Google Cloud Storage (Object Storage)
DEFAULT_OBJECT_STORAGE_BUCKET_ID=your-bucket-id
PUBLIC_OBJECT_SEARCH_PATHS=/your-bucket/public
PRIVATE_OBJECT_DIR=/your-bucket/.private

# Additional PostgreSQL credentials (automatically set in many environments)
PGHOST=your_host
PGPORT=5432
PGUSER=your_username
PGPASSWORD=your_password
PGDATABASE=your_database_name

# Production Port (default: 5000)
PORT=5000
```

#### Environment Variables Explanation:

- **DATABASE_URL**: Complete PostgreSQL connection string
- **SESSION_SECRET**: Random string for session encryption (generate a strong random string)
- **REPLIT_DOMAINS**: Your Replit app domain (only needed for Replit deployment)
- **Object Storage**: Google Cloud Storage configuration for file uploads
- **PG* variables**: Individual PostgreSQL connection parameters

### 4. Database Schema Setup

Push the database schema to your PostgreSQL database:

```bash
npm run db:push
```

This command will create all necessary tables in your database using Drizzle ORM.

### 5. Creating the First Admin User (SuperAdmin Setup)

After setting up the database schema, you need to create the first SuperAdmin user to manage the platform.

#### Prerequisites for Admin Setup

1. **First, login to create your user account**:
   - Start the application: `npm run dev`
   - Visit `http://localhost:5000`
   - Login using Replit authentication (this creates your user account in the database)
   - Note down the email address you used to login

#### Creating the SuperAdmin Account

2. **Access the SuperAdmin setup page**:
   - Navigate to: `http://localhost:5000/setup-superadmin`
   - You'll see a SuperAdmin Setup form

3. **Complete the setup form**:
   - **Email Address**: Enter the exact email you used when logging in above
   - **Setup Key**: Enter the setup key (default: `replit-fitness-admin-2025`)
     - You can customize this by setting `SUPERADMIN_SETUP_KEY` in your `.env` file
   - Click "Create SuperAdmin Account"

4. **Login as SuperAdmin**:
   - After successful setup, you'll be redirected to login
   - Login with the same credentials you used before
   - You now have SuperAdmin access to the entire platform

#### Setup Key Security

For production deployments, make sure to:
- Set a custom `SUPERADMIN_SETUP_KEY` in your environment variables
- Use a strong, unique setup key that only authorized personnel know
- The setup endpoint only works when no SuperAdmins exist in the system

```env
# Add to your .env file for custom setup key
SUPERADMIN_SETUP_KEY=your-custom-secure-setup-key-here
```

#### What SuperAdmins Can Do

Once logged in as SuperAdmin, you can:
- **Manage Trainers**: Approve, reject, or suspend trainer applications
- **View All Data**: Access all clients, training plans, and exercises across the platform
- **Manage Payment Plans**: Create and configure payment plans for trainers
- **Platform Administration**: Monitor system statistics and user activity
- **Promote Other Users**: Promote existing users to SuperAdmin role

#### Creating Additional SuperAdmins

After the initial setup, existing SuperAdmins can promote other users:
1. The user must first login to create their account
2. Use the "Manage Trainers" section in the admin dashboard
3. Use the promote functionality to grant SuperAdmin access

#### Troubleshooting Admin Setup

**Common Issues:**

1. **"User not found" error**: 
   - Make sure you've logged in at least once to create the user account
   - Use the exact same email address

2. **"Invalid setup key" error**:
   - Check your `SUPERADMIN_SETUP_KEY` environment variable
   - Default key is: `replit-fitness-admin-2025`

3. **"SuperAdmin already exists" error**:
   - The setup endpoint only works for the very first SuperAdmin
   - Use the promote user functionality from existing SuperAdmin account

### 6. Create Test Users for Production (SQL Queries)

To quickly set up test users for immediate production testing, run these SQL queries in your PostgreSQL database:

```sql
-- Create required enums if they don't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('superadmin', 'trainer', 'client');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create test users
INSERT INTO users (id, email, first_name, last_name, role, status, created_at, updated_at) 
VALUES 
    ('39363427', 'darkryuudan@gmail.com', 'Ronny', 'SuperAdmin', 'superadmin', 'active', NOW(), NOW()),
    ('46005006', 'kuban.solutions@gmail.com', 'Test', 'Trainer', 'trainer', 'active', NOW(), NOW()),
    ('client001', 'client.test@example.com', 'John', 'Client', 'client', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create trainer profile for the trainer user
INSERT INTO trainers (id, user_id, referral_code, expertise, experience, created_at, updated_at)
VALUES 
    (gen_random_uuid(), '46005006', 'TR240001', 'Weight Training & Nutrition', '5+ Years', NOW(), NOW())
ON CONFLICT (user_id) DO NOTHING;

-- Create client profile linked to the trainer
INSERT INTO clients (id, user_id, trainer_id, phone, age, height, weight, current_weight, target_weight, body_goal, activity_level, created_at, updated_at)
SELECT 
    gen_random_uuid(), 
    'client001', 
    t.id, 
    '+1-555-0123', 
    28, 
    175.00, 
    80.00, 
    80.00, 
    75.00, 
    'Build lean muscle and improve overall fitness', 
    'moderate',
    NOW(), 
    NOW()
FROM trainers t 
WHERE t.user_id = '46005006'
ON CONFLICT (user_id) DO NOTHING;
```

**What these queries create:**

1. **SuperAdmin Account** (`darkryuudan@gmail.com`)
   - Full admin access to manage trainers and system settings
   - Can approve/reject trainer applications

2. **Trainer Account** (`kuban.solutions@gmail.com`) 
   - Referral code: `TR240001`
   - Can create training plans and manage clients
   - Has expertise in weight training & nutrition

3. **Client Account** (`client.test@example.com`)
   - Linked to the trainer account
   - Sample fitness profile with goals and measurements
   - Can view training plans and track progress

**After running these queries:**
- You can immediately test all three user roles
- The client-trainer relationship is pre-configured
- All accounts are active and ready for testing

### 7. Google Cloud Storage Setup (Optional)

For file upload functionality:

1. Create a Google Cloud Storage bucket
2. Set up appropriate IAM permissions
3. Configure the bucket ID and paths in your environment variables

## 🚦 Running the Application

### Development Mode

```bash
npm run dev
```

This starts both the backend API server and frontend development server on `http://localhost:5000`.

### Production Build

```bash
# Build the application
npm run build

# Start the production server
npm start
```

### Development Scripts

- `npm run dev` - Start development server (frontend + backend)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes

## 🔐 Authentication Setup

### For Replit Deployment

The application uses Replit's OIDC authentication. When deploying on Replit:

1. Set `REPLIT_DOMAINS` to your Replit app domain
2. `REPL_ID` is automatically provided by Replit
3. `ISSUER_URL` should be `https://replit.com/oidc`

### For Custom Deployment

For non-Replit deployments, you'll need to modify the authentication system in `server/replitAuth.ts` to use your preferred authentication provider.

## 📁 Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility libraries
│   │   └── App.tsx         # Main app component
│   └── index.html
├── server/                 # Backend Express application
│   ├── db.ts              # Database connection
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Data access layer
│   ├── replitAuth.ts      # Authentication setup
│   ├── objectStorage.ts   # File storage service
│   └── index.ts           # Server entry point
├── shared/                 # Shared types and schemas
│   └── schema.ts          # Database schema and types
├── package.json           # Dependencies and scripts
├── drizzle.config.ts      # Database configuration
└── vite.config.ts         # Build configuration
```

## 🗄️ Database Configuration

### Development vs Production

- **Development**: The application connects to your database using the `DATABASE_URL` environment variable
- **Production**: Update the `DATABASE_URL` with your production database credentials

### Changing Database Connection

To change your database connection:

1. Update the `DATABASE_URL` in your `.env` file
2. Ensure the database exists and is accessible
3. Run `npm run db:push` to apply the schema
4. Restart the application

### Database Schema

The database schema is defined in `shared/schema.ts` using Drizzle ORM. Key tables include:

- `users` - User accounts and authentication
- `trainers` - Trainer profiles and information
- `clients` - Client profiles and data
- `training_plans` - Workout plans and routines
- `exercises` - Exercise library and media
- `evaluations` - Progress tracking and assessments
- `chat_messages` - Real-time messaging
- `sessions` - User session storage

## 🔧 Production Deployment

### Environment Setup

1. Set `NODE_ENV=production`
2. Configure production database URL
3. Set up Google Cloud Storage for file uploads
4. Configure domain and authentication settings
5. Ensure all security environment variables are set

### Build Process

The application builds into a `dist/` directory:
- Frontend assets: `dist/public/`
- Backend bundle: `dist/index.js`

### Port Configuration

The application serves on port 5000 by default. In production, set the `PORT` environment variable to match your hosting platform's requirements.

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify `DATABASE_URL` is correct
   - Ensure database server is running
   - Check firewall settings

2. **Authentication Issues**
   - Verify Replit environment variables
   - Check `SESSION_SECRET` is set
   - Ensure domain configuration is correct

3. **File Upload Problems**
   - Verify Google Cloud Storage configuration
   - Check bucket permissions
   - Ensure storage environment variables are set

4. **Build Errors**
   - Run `npm run check` for TypeScript errors
   - Ensure all dependencies are installed
   - Check Node.js version compatibility

### Debug Mode

For additional logging, set `NODE_ENV=development` to enable debug output.

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and type checking
5. Submit a pull request

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the project documentation
3. Open an issue on GitHub with detailed information about the problem