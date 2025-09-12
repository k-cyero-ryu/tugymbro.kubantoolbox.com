# My Body Trainer Manager

A comprehensive, multi-lingual web application that connects personal trainers with their clients. The platform enables trainers to manage client relationships, create customized training plans, track progress, and facilitate direct communication.

## 🚀 Features

- **Multi-Role System**: SuperAdmin, Trainer, and Client roles with role-based access control
- **Training Management**: Create and manage customized training plans with detailed exercises, sets, reps, and weights
- **Daily Workout Tracking**: Complete workout tracking with exercise timers and progress logging
- **Progress Monitoring**: Comprehensive monthly evaluations with body measurements and T-pose photo analysis
- **Real-time Communication**: WebSocket-based chat system with message history
- **Multi-language Support**: English, Spanish, French, and Portuguese
- **Visual Intelligence**: T-pose photo analysis for body measurements and progress comparison
- **Exercise Media Management**: Secure upload and storage for exercise videos, images, and documents with access control
- **Referral System**: Trainer referral codes for automatic client-trainer assignment
- **Payment Plan Management**: SuperAdmin manages trainer plans, trainers manage client plans
- **Responsive Design**: Mobile-friendly interface with modern UI components
- **Password Reset**: SuperAdmin can reset passwords for any user
- **User Management**: Comprehensive user administration with search and filtering
- **Analytics & Reporting**: System statistics, trainer analytics, and client progress reports

### File Storage & Privacy

The application uses Google Cloud Storage with a sophisticated access control system:
- **Exercise Media**: Private by default, accessible only to trainers and their assigned clients
- **T-pose Evaluation Photos**: Made public for accessibility and comparison features
- **User Profiles**: Private assets protected by role-based access control
- **Public Assets**: Served via `/public-objects/` route with appropriate caching headers

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express.js + TypeScript
- **Database**: PostgreSQL (Neon Serverless)
- **ORM**: Drizzle ORM
- **Authentication**: Username/Password with bcrypt hashing + Session-based authentication
- **File Storage**: Google Cloud Storage
- **UI Framework**: Tailwind CSS + shadcn/ui
- **State Management**: TanStack Query (React Query)
- **Real-time**: WebSocket (ws library)

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or cloud)
- Google Cloud Storage bucket (optional)

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

# SuperAdmin Setup Key (customize for security)
SUPERADMIN_SETUP_KEY=your-secure-setup-key-2025

# Google Cloud Storage (Object Storage) - Optional
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
- **SUPERADMIN_SETUP_KEY**: Security key for creating the first SuperAdmin account
- **Object Storage**: Google Cloud Storage configuration for file uploads (optional)
- **PG* variables**: Individual PostgreSQL connection parameters

### 4. Database Schema Setup

Push the database schema to your PostgreSQL database:

```bash
npm run db:push
```

This command will create all necessary tables in your database using Drizzle ORM.

### 5. Creating the First SuperAdmin Account

After setting up the database schema, create your first SuperAdmin account to manage the platform.

#### SuperAdmin Registration

1. **Start the application**:
   ```bash
   npm run dev
   ```

2. **Access the SuperAdmin setup page**:
   - Navigate to: `http://localhost:5000/setup-superadmin`

3. **Create your SuperAdmin account**:
   - **First Name & Last Name**: Your full name
   - **Username**: Choose a unique username (e.g., `admin` or `superadmin`)
   - **Email**: Your email address
   - **Password**: Create a strong password (minimum 8 characters)
   - **Setup Key**: Enter your setup key from the environment variables
     - Default: `your-secure-setup-key-2025` (customize in `.env` file)

4. **Complete Registration**:
   - Click "Create SuperAdmin Account"
   - You'll be automatically logged in with full platform access

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
- **User Management**: View, search, and reset passwords for any user
- **Manage Trainers**: Approve, reject, or suspend trainer applications
- **View All Data**: Access all clients, training plans, and exercises across the platform
- **Manage Payment Plans**: Create and configure payment plans for trainers
- **Platform Administration**: Monitor system statistics and user activity
- **Password Reset**: Reset passwords for users who forgot their credentials

#### Creating Additional SuperAdmins

After the initial setup, existing SuperAdmins can promote other users:
1. Regular users can register normally through `/register`
2. Use the "User Management" section in the admin dashboard
3. Find the user and use the promote functionality to grant SuperAdmin access

#### Troubleshooting SuperAdmin Setup

**Common Issues:**

1. **"Invalid setup key" error**:
   - Check your `SUPERADMIN_SETUP_KEY` environment variable
   - Make sure it matches what you entered

2. **"SuperAdmin already exists" error**:
   - The setup endpoint only works for the very first SuperAdmin
   - Use the promote user functionality from existing SuperAdmin account

3. **Username/email already exists**:
   - Choose a different username
   - Make sure email is unique in the system

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

## 🔐 Authentication System

### Username/Password Authentication

The application uses a secure username/password authentication system:

- **Password Security**: Passwords are hashed using bcrypt with 12 salt rounds
- **Session Management**: Secure HTTP-only cookies with PostgreSQL session storage
- **Role-Based Access**: Three-tier permission system (SuperAdmin, Trainer, Client)
- **Password Reset**: SuperAdmins can reset passwords for any user
- **Account Status**: Users can be active, inactive, or pending approval

### User Registration Flow

1. **New Users**: Can register through `/register`
2. **Role Selection**: Choose between Trainer or Client during registration
3. **Trainer Approval**: Trainer accounts require SuperAdmin approval
4. **Client Assignment**: Clients can enter referral codes to be assigned to trainers
5. **Automatic Login**: Users are automatically logged in after successful registration

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
│   ├── auth.ts            # Authentication system
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

- `users` - User accounts with username/password authentication, roles, and status
- `trainers` - Trainer profiles with referral codes, expertise, and payment plan assignments
- `clients` - Client profiles linked to trainers with body measurements and goals
- `training_plans` - Detailed workout plans with duration, nutrition guidelines, and exercise cycles
- `exercises` - Exercise library with media files, categories, and trainer assignments
- `plan_exercises` - Junction table linking exercises to training plans with specific workout details
- `client_plans` - Assignment of training plans to specific clients
- `workout_logs` - Daily workout tracking with completed sets, reps, and weights
- `monthly_evaluations` - Progress assessments with body measurements and T-pose photos
- `chat_messages` - Real-time messaging between users with read status
- `payment_plans` - SuperAdmin-managed payment plans for trainers
- `client_payment_plans` - Trainer-managed payment plans for clients
- `sessions` - Secure session storage for authentication

## 👥 User Roles & Permissions

### SuperAdmin
- **User Management**: View all users, search/filter, reset passwords, promote users
- **Trainer Management**: Approve/reject/suspend trainer applications, manage trainer payment plans
- **Platform Administration**: System statistics, platform monitoring, payment plan creation
- **Global Access**: View all clients, training plans, exercises, and evaluations across the platform
- **Communication**: Chat with any user on the platform

### Trainer
- **Client Management**: View and manage assigned clients, suspend/reactivate clients
- **Training Plans**: Create, edit, and assign customized training plans with detailed exercises
- **Exercise Library**: Create and manage exercise database with media uploads
- **Progress Tracking**: Monitor client evaluations, workout logs, and body measurements
- **Payment Plans**: Create and assign payment plans to clients
- **Communication**: Real-time chat with clients and SuperAdmins
- **Analytics**: View client statistics, progress reports, and revenue tracking
- **Referral System**: Unique referral codes for client acquisition

### Client
- **Training Plans**: View assigned plans, daily workouts with exercise details
- **Workout Tracking**: Log completed exercises with sets, reps, weights, and exercise timers
- **Progress Monitoring**: Monthly evaluations with body measurements and T-pose photos
- **Communication**: Real-time chat with assigned trainer
- **Profile Management**: Update personal information, goals, and preferences
- **Progress Analytics**: View workout streaks, weekly stats, and progress comparisons

## 🔧 Production Deployment

### Environment Setup

1. Set `NODE_ENV=production`
2. Configure production database URL
3. Set up Google Cloud Storage for file uploads (optional)
4. Set strong `SESSION_SECRET` and `SUPERADMIN_SETUP_KEY`
5. Configure domain settings

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
   - Check `SESSION_SECRET` is set
   - Verify password meets minimum requirements
   - Ensure user status is 'active'

3. **File Upload Problems**
   - Verify Google Cloud Storage configuration
   - Check bucket permissions
   - Ensure storage environment variables are set

4. **Build Errors**
   - Run `npm run check` for TypeScript errors
   - Ensure all dependencies are installed
   - Check Node.js version compatibility

5. **SuperAdmin Setup Issues**
   - Verify `SUPERADMIN_SETUP_KEY` environment variable
   - Ensure no SuperAdmin already exists in the database
   - Check database connectivity

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