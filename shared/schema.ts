import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  decimal,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export const userRoleEnum = pgEnum('user_role', ['superadmin', 'trainer', 'client']);

// User status enum
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'pending']);

// Users table (with username/password authentication)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique().notNull(),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(), // hashed password
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default('client'),
  status: userStatusEnum("status").notNull().default('active'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Trainers table
export const trainers = pgTable("trainers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  referralCode: varchar("referral_code").unique().notNull(),
  expertise: text("expertise"),
  experience: varchar("experience"),
  gallery: jsonb("gallery").default('[]'),
  monthlyRevenue: decimal("monthly_revenue", { precision: 10, scale: 2 }).default('0'),
  paymentPlanId: varchar("payment_plan_id").references(() => paymentPlans.id), // Assigned by SuperAdmin
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clients table
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  trainerId: varchar("trainer_id").notNull().references(() => trainers.id, { onDelete: 'cascade' }),
  phone: varchar("phone"),
  dateOfBirth: timestamp("date_of_birth"),
  age: integer("age"),
  height: decimal("height", { precision: 5, scale: 2 }),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  currentWeight: decimal("current_weight", { precision: 5, scale: 2 }),
  targetWeight: decimal("target_weight", { precision: 5, scale: 2 }),
  bodyGoal: text("body_goal"),
  goals: text("goals"),
  activityLevel: varchar("activity_level").default('moderate'),
  medicalConditions: text("medical_conditions"),
  dietaryRestrictions: text("dietary_restrictions"),
  referralSource: varchar("referral_source"),
  paymentPlan: varchar("payment_plan"), // Legacy field for backward compatibility
  clientPaymentPlanId: varchar("client_payment_plan_id"), // New payment plan reference - will add foreign key after clientPaymentPlans is defined
  paymentStatus: varchar("payment_status").default('active'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Training plans table
export const trainingPlans = pgTable("training_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull().references(() => trainers.id, { onDelete: 'cascade' }),
  name: varchar("name").notNull(),
  description: text("description"),
  goal: text("goal"),
  duration: integer("duration"), // Total plan duration in weeks, 0 = "till goal is met"
  weekCycle: integer("week_cycle").default(1), // How many weeks before pattern repeats
  dailyCalories: integer("daily_calories"),
  protein: integer("protein"),
  carbs: integer("carbs"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Exercises table
export const exercises = pgTable("exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull().references(() => trainers.id, { onDelete: 'cascade' }),
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category"),
  mediaUrl: varchar("media_url"),
  mediaType: varchar("media_type"), // 'image', 'video', 'pdf'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Plan exercises (many-to-many relationship)
export const planExercises = pgTable("plan_exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").notNull().references(() => trainingPlans.id, { onDelete: 'cascade' }),
  exerciseId: varchar("exercise_id").notNull().references(() => exercises.id, { onDelete: 'cascade' }),
  dayOfWeek: integer("day_of_week").notNull(), // 1-7 (1 = Monday, 7 = Sunday)
  week: integer("week").notNull().default(1), // Week number in the plan cycle (1-4)
  sets: integer("sets"),
  reps: integer("reps"),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  duration: integer("duration"), // in minutes
  restTime: integer("rest_time"), // in seconds
  notes: text("notes"),
});

// Client plan assignments
export const clientPlans = pgTable("client_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: 'cascade' }),
  planId: varchar("plan_id").notNull().references(() => trainingPlans.id, { onDelete: 'cascade' }),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Workout logs
export const workoutLogs = pgTable("workout_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: 'cascade' }),
  planExerciseId: varchar("plan_exercise_id").notNull().references(() => planExercises.id, { onDelete: 'cascade' }),
  completedSets: integer("completed_sets"),
  completedReps: integer("completed_reps"),
  setNumber: integer("set_number"), // Track individual set completion
  actualWeight: decimal("actual_weight", { precision: 5, scale: 2 }),
  actualDuration: integer("actual_duration"),
  notes: text("notes"),
  completedAt: timestamp("completed_at").defaultNow(),
});

// Monthly evaluations
export const monthlyEvaluations = pgTable("monthly_evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: 'cascade' }),
  weekNumber: integer("week_number").notNull(),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  bodyFatPercentage: decimal("body_fat_percentage", { precision: 4, scale: 2 }),
  waistMeasurement: decimal("waist_measurement", { precision: 5, scale: 2 }),
  chestMeasurement: decimal("chest_measurement", { precision: 5, scale: 2 }),
  hipsMeasurement: decimal("hips_measurement", { precision: 5, scale: 2 }),
  thighMeasurement: decimal("thigh_measurement", { precision: 5, scale: 2 }),
  calfMeasurement: decimal("calf_measurement", { precision: 5, scale: 2 }),
  bicepsMeasurement: decimal("biceps_measurement", { precision: 5, scale: 2 }),
  abdomenMeasurement: decimal("abdomen_measurement", { precision: 5, scale: 2 }),
  trainingAdherence: integer("training_adherence"), // 1-10
  mealAdherence: integer("meal_adherence"), // 1-10
  cardioAdherence: integer("cardio_adherence"), // 1-10
  selfEvaluation: integer("self_evaluation"), // 1-10
  notes: text("notes"),
  // T-pose photos for visual intelligence
  frontPhotoUrl: varchar("front_photo_url"),
  backPhotoUrl: varchar("back_photo_url"),
  sidePhotoUrl: varchar("side_photo_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Posts (motivational content)
export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull().references(() => trainers.id, { onDelete: 'cascade' }),
  title: varchar("title"),
  content: text("content"),
  mediaUrl: varchar("media_url"),
  mediaType: varchar("media_type"), // 'image', 'video'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat messages
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiverId: varchar("receiver_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relations
export const usersRelations = relations(users, ({ one, many }) => ({
  trainer: one(trainers, {
    fields: [users.id],
    references: [trainers.userId],
  }),
  client: one(clients, {
    fields: [users.id],
    references: [clients.userId],
  }),
  sentMessages: many(chatMessages, { relationName: "sender" }),
  receivedMessages: many(chatMessages, { relationName: "receiver" }),
}));

export const trainersRelations = relations(trainers, ({ one, many }) => ({
  user: one(users, {
    fields: [trainers.userId],
    references: [users.id],
  }),
  paymentPlan: one(paymentPlans, {
    fields: [trainers.paymentPlanId],
    references: [paymentPlans.id],
  }),
  clients: many(clients),
  trainingPlans: many(trainingPlans),
  exercises: many(exercises),
  posts: many(posts),
  clientPaymentPlans: many(clientPaymentPlans),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.id],
  }),
  trainer: one(trainers, {
    fields: [clients.trainerId],
    references: [trainers.id],
  }),
  clientPaymentPlan: one(clientPaymentPlans, {
    fields: [clients.clientPaymentPlanId],
    references: [clientPaymentPlans.id],
  }),
  clientPlans: many(clientPlans),
  workoutLogs: many(workoutLogs),
  monthlyEvaluations: many(monthlyEvaluations),
}));

export const trainingPlansRelations = relations(trainingPlans, ({ one, many }) => ({
  trainer: one(trainers, {
    fields: [trainingPlans.trainerId],
    references: [trainers.id],
  }),
  planExercises: many(planExercises),
  clientPlans: many(clientPlans),
}));

export const exercisesRelations = relations(exercises, ({ one, many }) => ({
  trainer: one(trainers, {
    fields: [exercises.trainerId],
    references: [trainers.id],
  }),
  planExercises: many(planExercises),
}));

export const planExercisesRelations = relations(planExercises, ({ one, many }) => ({
  plan: one(trainingPlans, {
    fields: [planExercises.planId],
    references: [trainingPlans.id],
  }),
  exercise: one(exercises, {
    fields: [planExercises.exerciseId],
    references: [exercises.id],
  }),
  workoutLogs: many(workoutLogs),
}));

export const clientPlansRelations = relations(clientPlans, ({ one }) => ({
  client: one(clients, {
    fields: [clientPlans.clientId],
    references: [clients.id],
  }),
  plan: one(trainingPlans, {
    fields: [clientPlans.planId],
    references: [trainingPlans.id],
  }),
}));

export const workoutLogsRelations = relations(workoutLogs, ({ one }) => ({
  client: one(clients, {
    fields: [workoutLogs.clientId],
    references: [clients.id],
  }),
  planExercise: one(planExercises, {
    fields: [workoutLogs.planExerciseId],
    references: [planExercises.id],
  }),
}));

export const monthlyEvaluationsRelations = relations(monthlyEvaluations, ({ one }) => ({
  client: one(clients, {
    fields: [monthlyEvaluations.clientId],
    references: [clients.id],
  }),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  trainer: one(trainers, {
    fields: [posts.trainerId],
    references: [trainers.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  sender: one(users, {
    fields: [chatMessages.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  receiver: one(users, {
    fields: [chatMessages.receiverId],
    references: [users.id],
    relationName: "receiver",
  }),
}));

// Will add clientPaymentPlansRelations after clientPaymentPlans table is defined

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const registerUserSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(8),
  referralCode: z.string().optional(),
  setupKey: z.string().optional(), // Required only for SuperAdmin registration
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
export const loginUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
export const insertTrainerSchema = createInsertSchema(trainers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTrainingPlanSchema = createInsertSchema(trainingPlans).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  duration: z.union([z.number(), z.string()]).transform(val => 
    typeof val === 'string' ? (val === 'till-goal' ? 0 : parseInt(val)) : val
  ),
  weekCycle: z.number().min(1).default(1)
});
export const insertExerciseSchema = createInsertSchema(exercises).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlanExerciseSchema = createInsertSchema(planExercises).omit({ id: true });
export const insertClientPlanSchema = createInsertSchema(clientPlans).omit({ id: true, createdAt: true });
export const insertWorkoutLogSchema = createInsertSchema(workoutLogs).omit({ id: true, completedAt: true });
export const insertMonthlyEvaluationSchema = createInsertSchema(monthlyEvaluations).omit({ id: true, createdAt: true, clientId: true }).extend({
  weight: z.union([z.string(), z.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
  bodyFatPercentage: z.union([z.string(), z.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
  waistMeasurement: z.union([z.string(), z.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
  chestMeasurement: z.union([z.string(), z.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
  hipsMeasurement: z.union([z.string(), z.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
  thighMeasurement: z.union([z.string(), z.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
  calfMeasurement: z.union([z.string(), z.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
  bicepsMeasurement: z.union([z.string(), z.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
  abdomenMeasurement: z.union([z.string(), z.number()]).transform(val => typeof val === 'number' ? val.toString() : val),
});
export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type InsertTrainer = z.infer<typeof insertTrainerSchema>;
export type Trainer = typeof trainers.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertTrainingPlan = z.infer<typeof insertTrainingPlanSchema>;
export type TrainingPlan = typeof trainingPlans.$inferSelect;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type Exercise = typeof exercises.$inferSelect;
export type InsertPlanExercise = z.infer<typeof insertPlanExerciseSchema>;
export type PlanExercise = typeof planExercises.$inferSelect;
export type InsertClientPlan = z.infer<typeof insertClientPlanSchema>;
export type ClientPlan = typeof clientPlans.$inferSelect;
export type InsertWorkoutLog = z.infer<typeof insertWorkoutLogSchema>;
export type WorkoutLog = typeof workoutLogs.$inferSelect;
export type InsertMonthlyEvaluation = z.infer<typeof insertMonthlyEvaluationSchema>;
export type MonthlyEvaluation = typeof monthlyEvaluations.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Payment Plans Configuration Table
// Payment plans table (SuperAdmin creates for trainers)
export const paymentPlans = pgTable("payment_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(), // e.g., "Basic Monthly", "Premium Quarterly"
  type: varchar("type").notNull(), // "monthly", "quarterly", "annual"
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Payment amount
  currency: varchar("currency").default("USD"),
  features: text("features").array(), // Array of features included
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client payment plans table (Trainers create for their clients)
export const clientPaymentPlans = pgTable("client_payment_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull().references(() => trainers.id, { onDelete: 'cascade' }),
  name: varchar("name").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: varchar("type").notNull(), // 'monthly', 'weekly', 'yearly'
  currency: varchar("currency").default("USD"),
  description: text("description"),
  features: text("features").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPaymentPlanSchema = createInsertSchema(paymentPlans).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  amount: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseFloat(val) : val)
});
export type InsertPaymentPlan = z.infer<typeof insertPaymentPlanSchema>;
export type PaymentPlan = typeof paymentPlans.$inferSelect;

export const insertClientPaymentPlanSchema = createInsertSchema(clientPaymentPlans).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  amount: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseFloat(val) : val)
});
export type InsertClientPaymentPlan = z.infer<typeof insertClientPaymentPlanSchema>;
export type ClientPaymentPlan = typeof clientPaymentPlans.$inferSelect;

// Client payment plans relations
export const clientPaymentPlansRelations = relations(clientPaymentPlans, ({ one, many }) => ({
  trainer: one(trainers, {
    fields: [clientPaymentPlans.trainerId],
    references: [trainers.id],
  }),
  clients: many(clients),
}));
