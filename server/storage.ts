import { db } from "./db";
import { datasets, conversations, messages } from "@shared/schema";
import type { Dataset, InsertDataset, Conversation, InsertConversation, Message, InsertMessage } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  createDataset(data: InsertDataset): Promise<Dataset>;
  getDataset(id: number): Promise<Dataset | undefined>;
  getAllDatasets(): Promise<Dataset[]>;
  deleteDataset(id: number): Promise<void>;

  createConversation(data: InsertConversation): Promise<Conversation>;
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationsByDataset(datasetId: number): Promise<Conversation[]>;

  createMessage(data: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
}

class DatabaseStorage implements IStorage {
  async createDataset(data: InsertDataset): Promise<Dataset> {
    const [dataset] = await db.insert(datasets).values(data).returning();
    return dataset;
  }

  async getDataset(id: number): Promise<Dataset | undefined> {
    const [dataset] = await db.select().from(datasets).where(eq(datasets.id, id));
    return dataset;
  }

  async getAllDatasets(): Promise<Dataset[]> {
    return db.select().from(datasets).orderBy(desc(datasets.createdAt));
  }

  async deleteDataset(id: number): Promise<void> {
    await db.delete(datasets).where(eq(datasets.id, id));
  }

  async createConversation(data: InsertConversation): Promise<Conversation> {
    const [conversation] = await db.insert(conversations).values(data).returning();
    return conversation;
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async getConversationsByDataset(datasetId: number): Promise<Conversation[]> {
    return db.select().from(conversations).where(eq(conversations.datasetId, datasetId)).orderBy(desc(conversations.createdAt));
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(data).returning();
    return message;
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  }
}

export const storage = new DatabaseStorage();
