import {
  users,
  trainers,
  clients,
  trainingPlans,
  exercises,
  planExercises,
  clientPlans,
  workoutLogs,
  monthlyEvaluations,
  posts,
  chatMessages,
  paymentPlans,
  clientPaymentPlans,
  type User,
  type UpsertUser,
  type Trainer,
  type InsertTrainer,
  type Client,
  type InsertClient,
  type TrainingPlan,
  type InsertTrainingPlan,
  type Exercise,
  type InsertExercise,
  type PlanExercise,
  type InsertPlanExercise,
  type ClientPlan,
  type InsertClientPlan,
  type WorkoutLog,
  type InsertWorkoutLog,
  type MonthlyEvaluation,
  type InsertMonthlyEvaluation,
  type Post,
  type InsertPost,
  type ChatMessage,
  type InsertChatMessage,
  type PaymentPlan,
  type InsertPaymentPlan,
  type ClientPaymentPlan,
  type InsertClientPaymentPlan,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count, sum, sql, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Trainer operations
  createTrainer(trainer: InsertTrainer): Promise<Trainer>;
  getTrainer(id: string): Promise<Trainer | undefined>;
  getTrainerByUserId(userId: string): Promise<Trainer | undefined>;
  getTrainerByReferralCode(code: string): Promise<Trainer | undefined>;
  updateTrainer(id: string, trainer: Partial<InsertTrainer>): Promise<Trainer>;
  getAllTrainers(): Promise<Trainer[]>;
  getPendingTrainers(): Promise<Trainer[]>;
  getApprovedTrainers(): Promise<Trainer[]>;
  approveTrainer(trainerId: string): Promise<void>;
  rejectTrainer(trainerId: string): Promise<void>;
  suspendTrainer(trainerId: string): Promise<void>;

  // Client operations
  createClient(client: InsertClient): Promise<Client>;
  getClient(id: string): Promise<Client | undefined>;
  getClientById(clientId: string): Promise<Client | undefined>;
  getClientByUserId(userId: string): Promise<Client | undefined>;
  getClientsByTrainer(trainerId: string): Promise<Client[]>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client>;
  suspendClient(clientId: string): Promise<void>;
  reactivateClient(clientId: string): Promise<void>;

  // Training plan operations
  createTrainingPlan(plan: InsertTrainingPlan): Promise<TrainingPlan>;
  getTrainingPlan(id: string): Promise<TrainingPlan | undefined>;
  getTrainingPlansByTrainer(trainerId: string): Promise<TrainingPlan[]>;
  updateTrainingPlan(id: string, plan: Partial<InsertTrainingPlan>): Promise<TrainingPlan>;
  deleteTrainingPlan(id: string): Promise<void>;

  // Exercise operations
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  getExercise(id: string): Promise<Exercise | undefined>;
  getExercisesByTrainer(trainerId: string): Promise<Exercise[]>;
  updateExercise(id: string, exercise: Partial<InsertExercise>): Promise<Exercise>;
  deleteExercise(id: string): Promise<void>;

  // Plan exercise operations
  createPlanExercise(planExercise: InsertPlanExercise): Promise<PlanExercise>;
  createPlanExercises(planId: string, exercises: Array<Omit<InsertPlanExercise, 'planId'>>): Promise<void>;
  getPlanExercisesByPlan(planId: string): Promise<PlanExercise[]>;
  updatePlanExercise(id: string, planExercise: Partial<InsertPlanExercise>): Promise<PlanExercise>;
  deletePlanExercise(id: string): Promise<void>;

  // Client plan operations
  assignPlanToClient(clientPlan: InsertClientPlan): Promise<ClientPlan>;
  getClientPlans(clientId: string): Promise<ClientPlan[]>;
  getActiveClientPlan(clientId: string): Promise<ClientPlan | undefined>;

  // Workout log operations
  createWorkoutLog(log: InsertWorkoutLog): Promise<WorkoutLog>;
  getWorkoutLogsByClient(clientId: string): Promise<WorkoutLog[]>;

  // Monthly evaluation operations
  createMonthlyEvaluation(evaluation: InsertMonthlyEvaluation): Promise<MonthlyEvaluation>;
  getMonthlyEvaluation(id: string): Promise<MonthlyEvaluation | undefined>;
  getMonthlyEvaluationsByClient(clientId: string): Promise<MonthlyEvaluation[]>;

  // Post operations
  createPost(post: InsertPost): Promise<Post>;
  getPostsByTrainer(trainerId: string): Promise<Post[]>;
  updatePost(id: string, post: Partial<InsertPost>): Promise<Post>;
  deletePost(id: string): Promise<void>;

  // Chat operations
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(userId1: string, userId2: string): Promise<ChatMessage[]>;
  markMessagesAsRead(receiverId: string, senderId: string): Promise<void>;
  canTrainerChatWithUser(trainerId: string, targetUserId: string): Promise<boolean>;

  // Payment plan operations (SuperAdmin manages trainer payment plans)
  getAllPaymentPlans(): Promise<PaymentPlan[]>;
  getActivePaymentPlans(): Promise<PaymentPlan[]>;
  createPaymentPlan(plan: InsertPaymentPlan): Promise<PaymentPlan>;
  updatePaymentPlan(id: string, plan: Partial<InsertPaymentPlan>): Promise<PaymentPlan>;
  deletePaymentPlan(id: string): Promise<void>;

  // Client payment plan operations (Trainers manage client payment plans)
  createClientPaymentPlan(plan: InsertClientPaymentPlan): Promise<ClientPaymentPlan>;
  getClientPaymentPlansByTrainer(trainerId: string): Promise<ClientPaymentPlan[]>;
  getClientPaymentPlan(id: string): Promise<ClientPaymentPlan | undefined>;
  updateClientPaymentPlan(id: string, plan: Partial<InsertClientPaymentPlan>): Promise<ClientPaymentPlan>;
  deleteClientPaymentPlan(id: string): Promise<void>;
  assignClientPaymentPlan(clientId: string, clientPaymentPlanId: string | null): Promise<void>;

  // Analytics operations
  getTrainerStats(trainerId: string): Promise<{
    totalClients: number;
    activeClients: number;
    monthlyRevenue: number;
    totalPlans: number;
  }>;
  getClientStats(clientId: string): Promise<{
    workoutsThisWeek: number;
    currentWeight: number;
    goalProgress: number;
    streak: number;
  }>;
  getSystemStats(): Promise<{
    totalTrainers: number;
    activeTrainers: number;
    totalClients: number;
    monthlyRevenue: number;
  }>;

  // Admin view methods with filtering
  getAllClientsAdmin(filters: { trainer?: string; search?: string; status?: string }): Promise<any[]>;
  getAllTrainingPlansAdmin(filters: { trainer?: string; search?: string }): Promise<any[]>;
  getAllExercisesAdmin(filters: { trainer?: string; search?: string; category?: string }): Promise<any[]>;

  // Trainer management methods
  getTrainersWithDetails(): Promise<any[]>;
  updateTrainerPaymentPlan(trainerId: string, paymentPlanId: string | null): Promise<void>;
  updateTrainerStatus(trainerId: string, status: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, username));
    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role as any));
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  // Trainer operations
  async createTrainer(trainer: InsertTrainer): Promise<Trainer> {
    const [created] = await db.insert(trainers).values(trainer).returning();
    return created;
  }

  async getTrainer(id: string): Promise<Trainer | undefined> {
    const [trainer] = await db.select().from(trainers).where(eq(trainers.id, id));
    return trainer;
  }

  async getTrainerByUserId(userId: string): Promise<Trainer | undefined> {
    console.log('[DEBUG STORAGE] Looking for trainer with userId:', userId);
    const result = await db.select().from(trainers).where(eq(trainers.userId, userId));
    console.log('[DEBUG STORAGE] Found trainers:', result);
    const [trainer] = result;
    console.log('[DEBUG STORAGE] Returning trainer:', trainer);
    return trainer;
  }

  async getTrainerByReferralCode(code: string): Promise<Trainer | undefined> {
    const [trainer] = await db.select().from(trainers).where(eq(trainers.referralCode, code));
    return trainer;
  }

  async updateTrainer(id: string, trainer: Partial<InsertTrainer>): Promise<Trainer> {
    const [updated] = await db
      .update(trainers)
      .set({ ...trainer, updatedAt: new Date() })
      .where(eq(trainers.id, id))
      .returning();
    return updated;
  }

  async getAllTrainers(): Promise<Trainer[]> {
    return await db.select().from(trainers).orderBy(desc(trainers.createdAt));
  }

  async getPendingTrainers(): Promise<Trainer[]> {
    const result = await db
      .select({
        id: trainers.id,
        userId: trainers.userId,
        referralCode: trainers.referralCode,
        expertise: trainers.expertise,
        experience: trainers.experience,
        gallery: trainers.gallery,
        monthlyRevenue: trainers.monthlyRevenue,
        createdAt: trainers.createdAt,
        updatedAt: trainers.updatedAt,
        // Include user information for display
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        status: users.status,
        role: users.role,
      })
      .from(trainers)
      .innerJoin(users, eq(trainers.userId, users.id))
      .where(eq(users.status, 'pending'))
      .orderBy(desc(trainers.createdAt));
    return result as any[];
  }

  async getApprovedTrainers(): Promise<Trainer[]> {
    const result = await db
      .select({
        id: trainers.id,
        userId: trainers.userId,
        referralCode: trainers.referralCode,
        expertise: trainers.expertise,
        experience: trainers.experience,
        gallery: trainers.gallery,
        monthlyRevenue: trainers.monthlyRevenue,
        createdAt: trainers.createdAt,
        updatedAt: trainers.updatedAt,
        // Include user information for display
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        status: users.status,
        role: users.role,
      })
      .from(trainers)
      .innerJoin(users, eq(trainers.userId, users.id))
      .where(eq(users.status, 'active'))
      .orderBy(desc(trainers.createdAt));
    return result as any[];
  }

  async approveTrainer(trainerId: string): Promise<void> {
    console.log('ApproveTrainer: Looking for trainer with ID:', trainerId);
    
    // Get trainer to find userId
    const trainer = await this.getTrainer(trainerId);
    console.log('ApproveTrainer: Found trainer:', trainer);
    
    if (!trainer) {
      throw new Error('Trainer not found');
    }

    console.log('ApproveTrainer: Updating user status for userId:', trainer.userId);
    
    // Update user status to active
    const result = await db
      .update(users)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(users.id, trainer.userId))
      .returning();
      
    console.log('ApproveTrainer: Update result:', result);
  }

  async rejectTrainer(trainerId: string): Promise<void> {
    // Get trainer to find userId
    const trainer = await this.getTrainer(trainerId);
    if (!trainer) {
      throw new Error('Trainer not found');
    }

    // Delete trainer record and update user status
    await db.delete(trainers).where(eq(trainers.id, trainerId));
    await db
      .update(users)
      .set({ role: 'client', status: 'active', updatedAt: new Date() })
      .where(eq(users.id, trainer.userId));
  }

  async suspendTrainer(trainerId: string): Promise<void> {
    // Get trainer to find userId
    const trainer = await this.getTrainer(trainerId);
    if (!trainer) {
      throw new Error('Trainer not found');
    }

    // Update user status to inactive (suspended)
    await db
      .update(users)
      .set({ status: 'inactive', updatedAt: new Date() })
      .where(eq(users.id, trainer.userId));
  }

  // Client operations
  async createClient(client: InsertClient): Promise<Client> {
    const [created] = await db.insert(clients).values(client).returning();
    return created;
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async getClientByUserId(userId: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.userId, userId));
    return client;
  }

  async getClientsByTrainer(trainerId: string): Promise<any[]> {
    try {
      const clientResults = await db
        .select()
        .from(clients)
        .innerJoin(users, eq(clients.userId, users.id))
        .where(eq(clients.trainerId, trainerId))
        .orderBy(desc(clients.createdAt));

      return clientResults.map(row => ({
        ...row.clients,
        user: row.users,
      }));
    } catch (error) {
      console.error("Error in getClientsByTrainer:", error);
      return [];
    }
  }

  async updateClient(id: string, client: Partial<InsertClient>): Promise<Client> {
    const [updated] = await db
      .update(clients)
      .set({ ...client, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return updated;
  }

  async getClientById(clientId: string): Promise<Client | undefined> {
    try {
      const result = await db
        .select()
        .from(clients)
        .innerJoin(users, eq(clients.userId, users.id))
        .where(eq(clients.id, clientId));

      if (result.length === 0) {
        return undefined;
      }

      return {
        ...result[0].clients,
        user: result[0].users,
      } as any;
    } catch (error) {
      console.error("Error in getClientById:", error);
      return undefined;
    }
  }

  async suspendClient(clientId: string): Promise<void> {
    // Get client to find userId
    const client = await this.getClient(clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    // Update user status to inactive (since suspended is not a valid status)
    await db
      .update(users)
      .set({ status: 'inactive', updatedAt: new Date() })
      .where(eq(users.id, client.userId));
  }

  async reactivateClient(clientId: string): Promise<void> {
    // Get client to find userId
    const client = await this.getClient(clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    // Update user status to active
    await db
      .update(users)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(users.id, client.userId));
  }

  // Training plan operations
  async createTrainingPlan(plan: InsertTrainingPlan): Promise<TrainingPlan> {
    const [created] = await db.insert(trainingPlans).values(plan).returning();
    return created;
  }

  async getTrainingPlan(id: string): Promise<TrainingPlan | undefined> {
    const [plan] = await db.select().from(trainingPlans).where(eq(trainingPlans.id, id));
    return plan;
  }

  async getTrainingPlansByTrainer(trainerId: string): Promise<TrainingPlan[]> {
    return await db
      .select()
      .from(trainingPlans)
      .where(eq(trainingPlans.trainerId, trainerId))
      .orderBy(desc(trainingPlans.createdAt));
  }

  async updateTrainingPlan(id: string, plan: Partial<InsertTrainingPlan>): Promise<TrainingPlan> {
    const [updated] = await db
      .update(trainingPlans)
      .set({ ...plan, updatedAt: new Date() })
      .where(eq(trainingPlans.id, id))
      .returning();
    return updated;
  }

  async deleteTrainingPlan(id: string): Promise<void> {
    await db.delete(trainingPlans).where(eq(trainingPlans.id, id));
  }

  // Exercise operations
  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    const [created] = await db.insert(exercises).values(exercise).returning();
    return created;
  }

  async getExercise(id: string): Promise<Exercise | undefined> {
    const [exercise] = await db.select().from(exercises).where(eq(exercises.id, id));
    return exercise;
  }

  async getExercisesByTrainer(trainerId: string): Promise<Exercise[]> {
    return await db
      .select()
      .from(exercises)
      .where(eq(exercises.trainerId, trainerId))
      .orderBy(desc(exercises.createdAt));
  }

  async updateExercise(id: string, exercise: Partial<InsertExercise>): Promise<Exercise> {
    const [updated] = await db
      .update(exercises)
      .set({ ...exercise, updatedAt: new Date() })
      .where(eq(exercises.id, id))
      .returning();
    return updated;
  }

  async deleteExercise(id: string): Promise<void> {
    await db.delete(exercises).where(eq(exercises.id, id));
  }

  // Plan exercise operations
  async createPlanExercise(planExercise: InsertPlanExercise): Promise<PlanExercise> {
    const [created] = await db.insert(planExercises).values(planExercise).returning();
    return created;
  }

  async createPlanExercises(planId: string, exercises: Array<Omit<InsertPlanExercise, 'planId'>>): Promise<void> {
    if (exercises.length === 0) return;
    
    const planExercisesToInsert = exercises.map(exercise => ({
      ...exercise,
      planId
    }));
    
    await db.insert(planExercises).values(planExercisesToInsert);
  }

  async getPlanExercisesByPlan(planId: string): Promise<PlanExercise[]> {
    return await db.select().from(planExercises).where(eq(planExercises.planId, planId));
  }

  async updatePlanExercise(id: string, planExercise: Partial<InsertPlanExercise>): Promise<PlanExercise> {
    const [updated] = await db
      .update(planExercises)
      .set(planExercise)
      .where(eq(planExercises.id, id))
      .returning();
    return updated;
  }

  async deletePlanExercise(id: string): Promise<void> {
    await db.delete(planExercises).where(eq(planExercises.id, id));
  }

  // Client plan operations
  async assignPlanToClient(clientPlan: InsertClientPlan): Promise<ClientPlan> {
    const [created] = await db.insert(clientPlans).values(clientPlan).returning();
    return created;
  }

  async getClientPlans(clientId: string): Promise<ClientPlan[]> {
    return await db.select().from(clientPlans).where(eq(clientPlans.clientId, clientId));
  }

  async getActiveClientPlan(clientId: string): Promise<ClientPlan | undefined> {
    const [plan] = await db
      .select()
      .from(clientPlans)
      .where(and(eq(clientPlans.clientId, clientId), eq(clientPlans.isActive, true)));
    return plan;
  }

  // Workout log operations
  async createWorkoutLog(log: InsertWorkoutLog): Promise<WorkoutLog> {
    const [created] = await db.insert(workoutLogs).values(log).returning();
    return created;
  }

  async updateWorkoutLog(id: string, log: Partial<InsertWorkoutLog>): Promise<WorkoutLog> {
    const [updated] = await db
      .update(workoutLogs)
      .set({ ...log, updatedAt: new Date() })
      .where(eq(workoutLogs.id, id))
      .returning();
    return updated;
  }

  async getWorkoutLogsByClient(clientId: string): Promise<WorkoutLog[]> {
    return await db
      .select()
      .from(workoutLogs)
      .where(eq(workoutLogs.clientId, clientId))
      .orderBy(desc(workoutLogs.completedAt));
  }

  async getWorkoutLogsByExercise(clientId: string, planExerciseId: string): Promise<WorkoutLog[]> {
    return await db
      .select()
      .from(workoutLogs)
      .where(and(eq(workoutLogs.clientId, clientId), eq(workoutLogs.planExerciseId, planExerciseId)))
      .orderBy(desc(workoutLogs.completedAt));
  }

  async getWorkoutLogsByDateRange(clientId: string, startDate: Date, endDate: Date): Promise<WorkoutLog[]> {
    return await db
      .select()
      .from(workoutLogs)
      .where(and(
        eq(workoutLogs.clientId, clientId),
        gte(workoutLogs.completedAt, startDate),
        lte(workoutLogs.completedAt, endDate)
      ))
      .orderBy(desc(workoutLogs.completedAt));
  }

  async deleteWorkoutLog(id: string): Promise<void> {
    await db.delete(workoutLogs).where(eq(workoutLogs.id, id));
  }

  // Monthly evaluation operations
  async createMonthlyEvaluation(evaluation: InsertMonthlyEvaluation): Promise<MonthlyEvaluation> {
    const [created] = await db.insert(monthlyEvaluations).values(evaluation).returning();
    return created;
  }

  async getMonthlyEvaluation(id: string): Promise<MonthlyEvaluation | undefined> {
    const [evaluation] = await db.select().from(monthlyEvaluations).where(eq(monthlyEvaluations.id, id));
    return evaluation;
  }

  async getMonthlyEvaluationsByClient(clientId: string): Promise<MonthlyEvaluation[]> {
    return await db
      .select()
      .from(monthlyEvaluations)
      .where(eq(monthlyEvaluations.clientId, clientId))
      .orderBy(desc(monthlyEvaluations.createdAt));
  }

  // Post operations
  async createPost(post: InsertPost): Promise<Post> {
    const [created] = await db.insert(posts).values(post).returning();
    return created;
  }

  async getPostsByTrainer(trainerId: string): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(eq(posts.trainerId, trainerId))
      .orderBy(desc(posts.createdAt));
  }

  async updatePost(id: string, post: Partial<InsertPost>): Promise<Post> {
    const [updated] = await db
      .update(posts)
      .set({ ...post, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();
    return updated;
  }

  async deletePost(id: string): Promise<void> {
    await db.delete(posts).where(eq(posts.id, id));
  }

  // Chat operations
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [created] = await db.insert(chatMessages).values(message).returning();
    return created;
  }

  async getChatMessages(userId1: string, userId2: string): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(
        sql`(${chatMessages.senderId} = ${userId1} AND ${chatMessages.receiverId} = ${userId2}) OR 
            (${chatMessages.senderId} = ${userId2} AND ${chatMessages.receiverId} = ${userId1})`
      )
      .orderBy(chatMessages.createdAt);
  }

  async markMessagesAsRead(receiverId: string, senderId: string): Promise<void> {
    await db
      .update(chatMessages)
      .set({ isRead: true })
      .where(and(eq(chatMessages.receiverId, receiverId), eq(chatMessages.senderId, senderId)));
  }

  // Payment plan operations
  async getAllPaymentPlans(): Promise<PaymentPlan[]> {
    return await db.select().from(paymentPlans).orderBy(paymentPlans.type, paymentPlans.amount);
  }

  async getActivePaymentPlans(): Promise<PaymentPlan[]> {
    return await db.select().from(paymentPlans)
      .where(eq(paymentPlans.isActive, true))
      .orderBy(paymentPlans.type, paymentPlans.amount);
  }

  async createPaymentPlan(plan: InsertPaymentPlan): Promise<PaymentPlan> {
    const [created] = await db.insert(paymentPlans).values(plan).returning();
    return created;
  }

  async updatePaymentPlan(id: string, plan: Partial<InsertPaymentPlan>): Promise<PaymentPlan> {
    const [updated] = await db
      .update(paymentPlans)
      .set({ ...plan, updatedAt: new Date() })
      .where(eq(paymentPlans.id, id))
      .returning();
    return updated;
  }

  async deletePaymentPlan(id: string): Promise<void> {
    await db.delete(paymentPlans).where(eq(paymentPlans.id, id));
  }

  // Check if trainer can chat with specific user
  async canTrainerChatWithUser(trainerId: string, targetUserId: string): Promise<boolean> {
    // Check if targetUser is superadmin
    const targetUser = await this.getUser(targetUserId);
    if (targetUser?.role === 'superadmin') {
      return true; // Trainers can always chat with superadmin
    }

    // Check if targetUser is trainer's client
    const client = await this.getClientByUserId(targetUserId);
    if (client && client.trainerId === trainerId) {
      return true;
    }

    return false;
  }

  // Analytics operations
  async getTrainerStats(trainerId: string): Promise<{
    totalClients: number;
    activeClients: number;
    monthlyRevenue: number;
    totalPlans: number;
  }> {
    const [stats] = await db
      .select({
        totalClients: count(clients.id),
        activeClients: count(sql`CASE WHEN ${users.status} = 'active' THEN 1 END`),
        monthlyRevenue: sum(trainers.monthlyRevenue),
        totalPlans: count(trainingPlans.id),
      })
      .from(trainers)
      .leftJoin(clients, eq(trainers.id, clients.trainerId))
      .leftJoin(users, eq(clients.userId, users.id))
      .leftJoin(trainingPlans, eq(trainers.id, trainingPlans.trainerId))
      .where(eq(trainers.id, trainerId))
      .groupBy(trainers.id);

    return {
      totalClients: Number(stats?.totalClients || 0),
      activeClients: Number(stats?.activeClients || 0),
      monthlyRevenue: Number(stats?.monthlyRevenue || 0),
      totalPlans: Number(stats?.totalPlans || 0),
    };
  }

  async getClientStats(clientId: string): Promise<{
    workoutsThisWeek: number;
    currentWeight: number;
    goalProgress: number;
    streak: number;
  }> {
    // This is a simplified implementation - in a real app you'd need more complex queries
    const client = await this.getClient(clientId);
    const evaluations = await this.getMonthlyEvaluationsByClient(clientId);
    const workoutLogs = await this.getWorkoutLogsByClient(clientId);

    const currentWeight = evaluations[0]?.weight ? Number(evaluations[0].weight) : Number(client?.weight || 0);
    const workoutsThisWeek = workoutLogs.filter(log => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return log.completedAt && log.completedAt > weekAgo;
    }).length;

    return {
      workoutsThisWeek,
      currentWeight,
      goalProgress: 75, // This would need proper calculation based on goals
      streak: 12, // This would need proper calculation based on consecutive workout days
    };
  }

  async getSystemStats(): Promise<{
    totalTrainers: number;
    activeTrainers: number;
    totalClients: number;
    monthlyRevenue: number;
  }> {
    const [stats] = await db
      .select({
        totalTrainers: count(trainers.id),
        activeTrainers: count(sql`CASE WHEN ${users.status} = 'active' THEN 1 END`),
        totalClients: count(clients.id),
        monthlyRevenue: sum(trainers.monthlyRevenue),
      })
      .from(trainers)
      .leftJoin(users, eq(trainers.userId, users.id))
      .leftJoin(clients, eq(trainers.id, clients.trainerId));

    return {
      totalTrainers: Number(stats?.totalTrainers || 0),
      activeTrainers: Number(stats?.activeTrainers || 0),
      totalClients: Number(stats?.totalClients || 0),
      monthlyRevenue: Number(stats?.monthlyRevenue || 0),
    };
  }

  // Admin view all clients with filtering
  async getAllClientsAdmin(filters: { trainer?: string; search?: string; status?: string }): Promise<any[]> {
    try {
      // First get all clients with their user info
      let clientsQuery = db
        .select()
        .from(clients)
        .innerJoin(users, eq(clients.userId, users.id));

      const conditions = [];
      
      if (filters.trainer) {
        conditions.push(eq(clients.trainerId, filters.trainer));
      }
      
      if (filters.search) {
        conditions.push(
          sql`(${users.email} ILIKE ${`%${filters.search}%`} OR 
              ${users.firstName} ILIKE ${`%${filters.search}%`} OR 
              ${users.lastName} ILIKE ${`%${filters.search}%`})`
        );
      }
      
      if (filters.status) {
        conditions.push(eq(users.status, filters.status as any));
      }

      if (conditions.length > 0) {
        const whereCondition = conditions.reduce((acc, condition, index) => 
          index === 0 ? condition : sql`${acc} AND ${condition}`
        );
        clientsQuery = clientsQuery.where(whereCondition);
      }

      const clientResults = await clientsQuery.orderBy(desc(clients.createdAt));

      // Then get trainer info separately to avoid complex joins
      const result = [];
      for (const row of clientResults) {
        const client = row.clients;
        const user = row.users;
        
        let trainerInfo = null;
        if (client.trainerId) {
          const trainer = await this.getTrainer(client.trainerId);
          if (trainer) {
            const trainerUser = await this.getUser(trainer.userId);
            trainerInfo = {
              trainerEmail: trainerUser?.email,
              trainerFirstName: trainerUser?.firstName,
              trainerLastName: trainerUser?.lastName,
            };
          }
        }

        result.push({
          ...client,
          userEmail: user.email,
          userFirstName: user.firstName,
          userLastName: user.lastName,
          userProfileImageUrl: user.profileImageUrl,
          userStatus: user.status,
          ...trainerInfo,
        });
      }

      return result;
    } catch (error) {
      console.error("Error in getAllClientsAdmin:", error);
      return [];
    }
  }

  // Admin view all training plans with filtering
  async getAllTrainingPlansAdmin(filters: { trainer?: string; search?: string }): Promise<any[]> {
    try {
      let query = db.select().from(trainingPlans);

      const conditions = [];
      
      if (filters.trainer) {
        conditions.push(eq(trainingPlans.trainerId, filters.trainer));
      }
      
      if (filters.search) {
        conditions.push(
          sql`(${trainingPlans.name} ILIKE ${`%${filters.search}%`} OR 
              ${trainingPlans.description} ILIKE ${`%${filters.search}%`})`
        );
      }

      if (conditions.length > 0) {
        const whereCondition = conditions.reduce((acc, condition, index) => 
          index === 0 ? condition : sql`${acc} AND ${condition}`
        );
        query = query.where(whereCondition);
      }

      const planResults = await query.orderBy(desc(trainingPlans.createdAt));

      // Get trainer info separately
      const result = [];
      for (const plan of planResults) {
        let trainerInfo = null;
        if (plan.trainerId) {
          const trainer = await this.getTrainer(plan.trainerId);
          if (trainer) {
            const trainerUser = await this.getUser(trainer.userId);
            trainerInfo = {
              trainerEmail: trainerUser?.email,
              trainerFirstName: trainerUser?.firstName,
              trainerLastName: trainerUser?.lastName,
            };
          }
        }

        result.push({
          ...plan,
          ...trainerInfo,
        });
      }

      return result;
    } catch (error) {
      console.error("Error in getAllTrainingPlansAdmin:", error);
      return [];
    }
  }

  // Admin view all exercises with filtering
  async getAllExercisesAdmin(filters: { trainer?: string; search?: string; category?: string }): Promise<any[]> {
    try {
      let query = db.select().from(exercises);

      const conditions = [];
      
      if (filters.trainer) {
        conditions.push(eq(exercises.trainerId, filters.trainer));
      }
      
      if (filters.search) {
        conditions.push(
          sql`(${exercises.name} ILIKE ${`%${filters.search}%`} OR 
              ${exercises.description} ILIKE ${`%${filters.search}%`})`
        );
      }
      
      if (filters.category) {
        conditions.push(eq(exercises.category, filters.category));
      }

      if (conditions.length > 0) {
        const whereCondition = conditions.reduce((acc, condition, index) => 
          index === 0 ? condition : sql`${acc} AND ${condition}`
        );
        query = query.where(whereCondition);
      }

      const exerciseResults = await query.orderBy(desc(exercises.createdAt));

      // Get trainer info separately
      const result = [];
      for (const exercise of exerciseResults) {
        let trainerInfo = null;
        if (exercise.trainerId) {
          const trainer = await this.getTrainer(exercise.trainerId);
          if (trainer) {
            const trainerUser = await this.getUser(trainer.userId);
            trainerInfo = {
              trainerEmail: trainerUser?.email,
              trainerFirstName: trainerUser?.firstName,
              trainerLastName: trainerUser?.lastName,
            };
          }
        }

        result.push({
          ...exercise,
          ...trainerInfo,
        });
      }

      return result;
    } catch (error) {
      console.error("Error in getAllExercisesAdmin:", error);
      return [];
    }
  }

  // Trainer management methods
  async getTrainersWithDetails(): Promise<any[]> {
    try {
      const result = await db
        .select({
          id: trainers.id,
          userId: trainers.userId,
          referralCode: trainers.referralCode,
          expertise: trainers.expertise,
          experience: trainers.experience,
          gallery: trainers.gallery,
          monthlyRevenue: trainers.monthlyRevenue,
          paymentPlanId: trainers.paymentPlanId,
          createdAt: trainers.createdAt,
          updatedAt: trainers.updatedAt,
        })
        .from(trainers)
        .orderBy(desc(trainers.createdAt));

      // Get additional details for each trainer
      const detailedTrainers = [];
      for (const trainer of result) {
        const user = await this.getUser(trainer.userId);
        let paymentPlan = null;
        if (trainer.paymentPlanId) {
          const [plan] = await db.select().from(paymentPlans).where(eq(paymentPlans.id, trainer.paymentPlanId));
          paymentPlan = plan;
        }

        // Get client count
        const [clientCount] = await db
          .select({ count: sql<number>`cast(count(*) as int)` })
          .from(clients)
          .where(eq(clients.trainerId, trainer.id));

        detailedTrainers.push({
          ...trainer,
          user,
          paymentPlan,
          clientCount: clientCount?.count || 0,
        });
      }

      return detailedTrainers;
    } catch (error) {
      console.error("Error in getTrainersWithDetails:", error);
      return [];
    }
  }

  async updateTrainerPaymentPlan(trainerId: string, paymentPlanId: string | null): Promise<void> {
    await db
      .update(trainers)
      .set({ 
        paymentPlanId,
        updatedAt: new Date() 
      })
      .where(eq(trainers.id, trainerId));
  }

  async updateTrainerStatus(trainerId: string, status: string): Promise<void> {
    // First get the trainer to find the user ID
    const [trainer] = await db
      .select({ userId: trainers.userId })
      .from(trainers)
      .where(eq(trainers.id, trainerId));

    if (!trainer) {
      throw new Error('Trainer not found');
    }

    // Update the user status
    await db
      .update(users)
      .set({ 
        status: status as any,
        updatedAt: new Date() 
      })
      .where(eq(users.id, trainer.userId));
  }

  // Client payment plan operations (Trainers manage client payment plans)
  async createClientPaymentPlan(plan: InsertClientPaymentPlan): Promise<ClientPaymentPlan> {
    const [created] = await db
      .insert(clientPaymentPlans)
      .values(plan)
      .returning();
    return created;
  }

  async getClientPaymentPlansByTrainer(trainerId: string): Promise<ClientPaymentPlan[]> {
    return await db
      .select()
      .from(clientPaymentPlans)
      .where(eq(clientPaymentPlans.trainerId, trainerId))
      .orderBy(desc(clientPaymentPlans.createdAt));
  }

  async getClientPaymentPlan(id: string): Promise<ClientPaymentPlan | undefined> {
    const [plan] = await db
      .select()
      .from(clientPaymentPlans)
      .where(eq(clientPaymentPlans.id, id));
    return plan;
  }

  async updateClientPaymentPlan(id: string, plan: Partial<InsertClientPaymentPlan>): Promise<ClientPaymentPlan> {
    const [updated] = await db
      .update(clientPaymentPlans)
      .set({
        ...plan,
        updatedAt: new Date()
      })
      .where(eq(clientPaymentPlans.id, id))
      .returning();
    return updated;
  }

  async deleteClientPaymentPlan(id: string): Promise<void> {
    // First, remove the payment plan reference from any clients using it
    await db
      .update(clients)
      .set({ clientPaymentPlanId: null })
      .where(eq(clients.clientPaymentPlanId, id));

    // Then delete the payment plan
    await db
      .delete(clientPaymentPlans)
      .where(eq(clientPaymentPlans.id, id));
  }

  async assignClientPaymentPlan(clientId: string, clientPaymentPlanId: string | null): Promise<void> {
    await db
      .update(clients)
      .set({
        clientPaymentPlanId,
        updatedAt: new Date()
      })
      .where(eq(clients.id, clientId));
  }
}

export const storage = new DatabaseStorage();
