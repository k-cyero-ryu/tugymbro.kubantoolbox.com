# My Body Trainer Manager

## Overview
My Body Trainer Manager is a comprehensive, multi-lingual web application that connects personal trainers with their clients. It enables trainers to manage client relationships, create customized training plans, track progress, and facilitate direct communication. The platform supports SuperAdmin, Trainer, and Client roles with role-based access control, offering features like real-time communication, exercise management, detailed progress tracking, and monthly evaluations including visual intelligence through T-pose photo analysis. The business vision is to provide a robust, scalable fitness management solution that enhances the training experience for both trainers and clients.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript (Vite build tool)
- **Styling**: Tailwind CSS with shadcn/ui for consistent design.
- **State Management**: TanStack Query (React Query) for server state and caching.
- **Routing**: Wouter for lightweight client-side routing.
- **Internationalization**: i18next for multi-language support (English, Spanish, French, Portuguese).
- **File Uploads**: Uppy for media file handling.

### Recent Changes (August 2025)
- **Media System**: Exercise videos/photos and T-pose evaluation photos both use `/objects/` route for public file serving without authentication. System stabilized after resolving path inconsistencies between `/objects/` and `/public-objects/` routes.

### Backend
- **Runtime**: Node.js with Express.js (TypeScript, ESM modules).
- **API Design**: RESTful API with WebSocket support for real-time chat.
- **Authentication**: Username/Password authentication with bcrypt hashing and session-based management.
- **Middleware**: Custom logging, error handling, and authentication.

### Data Storage
- **Primary Database**: PostgreSQL (Neon serverless hosting).
- **ORM**: Drizzle ORM for type-safe database operations.
- **Session Storage**: PostgreSQL-based session store (connect-pg-simple).
- **File Storage**: Google Cloud Storage with custom ACL system.
- **Schema**: Comprehensive schema covering users, trainers, clients, training plans, exercises, evaluations, chat, and progress.

### Authentication and Authorization
- **Authentication**: Username/Password authentication with bcrypt hashing and secure session management.
- **Session Management**: Secure HTTP-only cookies with PostgreSQL session storage.
- **Role-Based Access Control**: Three-tier permission system (SuperAdmin, Trainer, Client).
- **Authorization**: Route-level protection with role-based access validation.
- **Password Security**: 12-round bcrypt hashing with session-based authentication.

### System Design Choices
- **Monorepo Structure**: Shared TypeScript schemas between client and server for type safety.
- **Scalability**: Designed for scalability with serverless database and cloud file storage.
- **Real-time Capabilities**: Implemented via WebSocket connections for chat.
- **UI/UX**: Focus on a clean, consistent user interface utilizing shadcn/ui components for a streamlined experience. Monthly evaluations include T-pose photo integration for visual progress tracking. Navigation patterns are consistent across different sections (e.g., workout pages and evaluation history).

## External Dependencies
- **Cloud Services**:
    - Neon Database (PostgreSQL hosting)
    - Google Cloud Storage (file storage)
- **UI Libraries**: Radix UI primitives with shadcn/ui
- **Development Tools**: Vite
- **File Upload**: Uppy (with AWS S3 multipart upload for compatibility, though Google Cloud Storage is the primary storage)
- **Real-time Communication**: WebSocket implementation