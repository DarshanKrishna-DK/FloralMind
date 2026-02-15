import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import Papa from "papaparse";
import fs from "fs";
import os from "os";
import path from "path";
import { z } from "zod";
import { storage } from "./storage";
import { createTableFromCSV, detectSchema, queryDataset } from "./sqlite-manager";
import { generateDashboard, handleQuery, generateReport } from "./ai-service";
import { discoverSupabaseTables, importSupabaseTable } from "./supabase-service";
import type { ColumnInfo, DashboardMetric } from "@shared/schema";

const uploadDir = path.join(os.tmpdir(), "floralmind-uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

const querySchema = z.object({
  question: z.string().min(1, "Question is required").max(2000),
  history: z.array(z.object({
    role: z.string(),
    content: z.string(),
  })).optional().default([]),
});

const sqlSchema = z.object({
  sql: z.string().min(1, "SQL query is required").max(5000),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/health", (_, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/datasets/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const csvContent = fs.readFileSync(req.file.path, "utf-8");

      fs.unlinkSync(req.file.path);

      const parsed = Papa.parse(csvContent, {
        skipEmptyLines: true,
        dynamicTyping: false,
      });

      if (parsed.errors.length > 0 && parsed.data.length === 0) {
        return res.status(400).json({ error: "Invalid CSV file" });
      }

      const rows = parsed.data as string[][];
      if (rows.length < 2) {
        return res.status(400).json({ error: "CSV must have at least a header row and one data row" });
      }

      const headers = rows[0];
      const dataRows = rows.slice(1).filter((row) => row.length === headers.length);

      const columns = detectSchema(headers, dataRows);
      const datasetName = req.file.originalname.replace(/\.csv$/i, "");

      const { tableName, rowCount } = createTableFromCSV(datasetName, headers, dataRows, columns);

      const dataset = await storage.createDataset({
        name: datasetName,
        originalFilename: req.file.originalname,
        tableName,
        rowCount,
        columns,
      });

      res.json(dataset);
    } catch (err: any) {
      console.error("Upload error:", err);
      res.status(500).json({ error: err.message || "Upload failed" });
    }
  });

  app.get("/api/datasets", async (_, res) => {
    try {
      const all = await storage.getAllDatasets();
      res.json(all);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/datasets/:id", async (req, res) => {
    try {
      const dataset = await storage.getDataset(parseInt(req.params.id));
      if (!dataset) return res.status(404).json({ error: "Dataset not found" });
      res.json(dataset);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/datasets/:id/dashboard", async (req, res) => {
    try {
      const dataset = await storage.getDataset(parseInt(req.params.id));
      if (!dataset) return res.status(404).json({ error: "Dataset not found" });

      const result = await generateDashboard(
        dataset.tableName,
        dataset.columns as ColumnInfo[],
        dataset.rowCount
      );

      res.json(result);
    } catch (err: any) {
      console.error("Dashboard generation error:", err);
      res.status(500).json({ error: err.message || "Failed to generate dashboard" });
    }
  });

  app.post("/api/datasets/:id/query", async (req, res) => {
    try {
      const dataset = await storage.getDataset(parseInt(req.params.id));
      if (!dataset) return res.status(404).json({ error: "Dataset not found" });

      const parsed = querySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid request" });
      }

      const { question, history } = parsed.data;

      const result = await handleQuery(
        dataset.tableName,
        dataset.columns as ColumnInfo[],
        dataset.rowCount,
        question,
        history
      );

      res.json(result);
    } catch (err: any) {
      console.error("Query error:", err);
      res.status(500).json({ error: err.message || "Failed to process query" });
    }
  });

  app.post("/api/datasets/:id/report", async (req, res) => {
    try {
      const dataset = await storage.getDataset(parseInt(req.params.id));
      if (!dataset) return res.status(404).json({ error: "Dataset not found" });

      const reportSchema = z.object({
        metrics: z.array(z.object({
          label: z.string(),
          value: z.union([z.string(), z.number()]),
          change: z.string().optional(),
          icon: z.string().optional(),
        })).optional().default([]),
        chartTitles: z.array(z.string()).optional().default([]),
      });

      const parsed = reportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request" });
      }

      const report = await generateReport(
        dataset.tableName,
        dataset.columns as ColumnInfo[],
        dataset.rowCount,
        parsed.data.metrics as DashboardMetric[],
        parsed.data.chartTitles
      );

      res.json({ report });
    } catch (err: any) {
      console.error("Report generation error:", err);
      res.status(500).json({ error: err.message || "Failed to generate report" });
    }
  });

  app.post("/api/datasets/:id/sql", async (req, res) => {
    try {
      const dataset = await storage.getDataset(parseInt(req.params.id));
      if (!dataset) return res.status(404).json({ error: "Dataset not found" });

      const parsed = sqlSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid request" });
      }

      const result = queryDataset(dataset.tableName, parsed.data.sql);
      res.json(result);
    } catch (err: any) {
      console.error("SQL execution error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  const supabaseConnectSchema = z.object({
    url: z.string().url("Invalid Supabase URL"),
    key: z.string().min(10, "API key is too short"),
  });

  app.post("/api/supabase/tables", async (req, res) => {
    try {
      const parsed = supabaseConnectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid request" });
      }

      const { url, key } = parsed.data;
      const tables = await discoverSupabaseTables(url, key);
      res.json({ tables });
    } catch (err: any) {
      console.error("Supabase connection error:", err);
      res.status(500).json({ error: err.message || "Failed to connect to Supabase" });
    }
  });

  const supabaseImportSchema = z.object({
    url: z.string().url("Invalid Supabase URL"),
    key: z.string().min(10, "API key is too short"),
    tableName: z.string().min(1, "Table name is required"),
  });

  app.post("/api/supabase/import", async (req, res) => {
    try {
      const parsed = supabaseImportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid request" });
      }

      const { url, key, tableName } = parsed.data;
      const result = await importSupabaseTable(url, key, tableName);

      const dataset = await storage.createDataset({
        name: result.datasetName,
        originalFilename: `supabase:${tableName}`,
        tableName: result.localTableName,
        rowCount: result.rowCount,
        columns: result.columns,
      });

      res.json(dataset);
    } catch (err: any) {
      console.error("Supabase import error:", err);
      res.status(500).json({ error: err.message || "Failed to import Supabase table" });
    }
  });

  return httpServer;
}
