import { sql } from "drizzle-orm";
import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const datasets = pgTable("datasets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  originalFilename: text("original_filename").notNull(),
  tableName: text("table_name").notNull().unique(),
  rowCount: integer("row_count").notNull().default(0),
  columns: jsonb("columns").$type<ColumnInfo[]>().notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  datasetId: integer("dataset_id").notNull().references(() => datasets.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  chartData: jsonb("chart_data").$type<ChartConfig | null>(),
  suggestions: jsonb("suggestions").$type<string[] | null>(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertDatasetSchema = createInsertSchema(datasets).omit({
  id: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type Dataset = typeof datasets.$inferSelect;
export type InsertDataset = z.infer<typeof insertDatasetSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export interface ColumnInfo {
  name: string;
  type: "text" | "numeric" | "date";
  sample?: string;
}

export interface ChartConfig {
  type: "bar" | "line" | "pie" | "area" | "scatter";
  title: string;
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
  explanation?: string;
}

export interface DashboardMetric {
  label: string;
  value: string | number;
  change?: string;
  icon?: string;
}

export interface AIResponse {
  message: string;
  chart?: ChartConfig;
  suggestions?: string[];
  metrics?: DashboardMetric[];
  hypothesis?: string;
}
