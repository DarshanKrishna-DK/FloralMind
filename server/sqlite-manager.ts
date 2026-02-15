import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import type { ColumnInfo } from "@shared/schema";

const DB_DIR = path.resolve(process.cwd(), "data");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

function getDbPath(tableName: string): string {
  return path.join(DB_DIR, `${tableName}.sqlite`);
}

function sanitizeColumnName(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/^(\d)/, "_$1")
    .toLowerCase();
}

function sanitizeTableName(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/^(\d)/, "_$1")
    .toLowerCase()
    .slice(0, 60);
}

function detectColumnType(values: string[]): "numeric" | "date" | "text" {
  const nonEmpty = values.filter((v) => v.trim() !== "");
  if (nonEmpty.length === 0) return "text";

  const numericCount = nonEmpty.filter((v) => !isNaN(Number(v.replace(/,/g, "")))).length;
  if (numericCount / nonEmpty.length > 0.8) return "numeric";

  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/,
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
    /^\d{1,2}-\d{1,2}-\d{2,4}$/,
  ];
  const dateCount = nonEmpty.filter((v) => datePatterns.some((p) => p.test(v.trim()))).length;
  if (dateCount / nonEmpty.length > 0.6) return "date";

  return "text";
}

export function detectSchema(headers: string[], rows: string[][]): ColumnInfo[] {
  return headers.map((header, i) => {
    const values = rows.map((row) => row[i] || "").slice(0, 100);
    const type = detectColumnType(values);
    const sample = values.find((v) => v.trim() !== "") || "";
    return {
      name: header.trim(),
      type,
      sample,
    };
  });
}

export function createTableFromCSV(
  datasetName: string,
  headers: string[],
  rows: string[][],
  columns: ColumnInfo[]
): { tableName: string; rowCount: number } {
  const tableName = sanitizeTableName(`ds_${Date.now()}_${datasetName}`);
  const dbPath = getDbPath(tableName);
  const db = new Database(dbPath);

  db.pragma("journal_mode = WAL");

  const sanitizedHeaders = headers.map(sanitizeColumnName);

  const columnDefs = sanitizedHeaders
    .map((h, i) => {
      const type = columns[i]?.type === "numeric" ? "REAL" : "TEXT";
      return `"${h}" ${type}`;
    })
    .join(", ");

  db.exec(`CREATE TABLE IF NOT EXISTS data (id INTEGER PRIMARY KEY AUTOINCREMENT, ${columnDefs})`);

  const placeholders = sanitizedHeaders.map(() => "?").join(", ");
  const insertStmt = db.prepare(`INSERT INTO data (${sanitizedHeaders.map((h) => `"${h}"`).join(", ")}) VALUES (${placeholders})`);

  const insertMany = db.transaction((dataRows: string[][]) => {
    for (const row of dataRows) {
      const values = row.map((val, i) => {
        if (columns[i]?.type === "numeric") {
          const cleaned = val.replace(/,/g, "").trim();
          const num = Number(cleaned);
          return isNaN(num) ? null : num;
        }
        return val.trim() || null;
      });
      insertStmt.run(...values);
    }
  });

  insertMany(rows);
  db.close();

  return { tableName, rowCount: rows.length };
}

export function queryDataset(tableName: string, sql: string): { columns: string[]; rows: any[] } {
  const dbPath = getDbPath(tableName);
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Dataset not found: ${tableName}`);
  }

  const db = new Database(dbPath, { readonly: true });

  try {
    const safeSql = sql.trim();
    const upper = safeSql.toUpperCase();
    if (!upper.startsWith("SELECT")) {
      throw new Error("Only SELECT queries are allowed");
    }

    const forbidden = ["DROP", "DELETE", "INSERT", "UPDATE", "ALTER", "CREATE", "ATTACH", "DETACH", "PRAGMA", "SQLITE_MASTER", "SQLITE_SCHEMA"];
    for (const word of forbidden) {
      if (upper.includes(word)) {
        throw new Error(`Forbidden keyword in query: ${word}`);
      }
    }

    const limitedSql = upper.includes("LIMIT") ? safeSql : `${safeSql} LIMIT 500`;

    const stmt = db.prepare(limitedSql);
    const rows = stmt.all();
    const columns = rows.length > 0 ? Object.keys(rows[0] as any) : [];

    return { columns, rows };
  } finally {
    db.close();
  }
}

export function getTableColumns(tableName: string): string[] {
  const dbPath = getDbPath(tableName);
  if (!fs.existsSync(dbPath)) return [];

  const db = new Database(dbPath, { readonly: true });
  try {
    const info = db.prepare("PRAGMA table_info(data)").all() as any[];
    return info.map((col: any) => col.name).filter((n: string) => n !== "id");
  } finally {
    db.close();
  }
}

export function getSampleData(tableName: string, limit = 5): any[] {
  const dbPath = getDbPath(tableName);
  if (!fs.existsSync(dbPath)) return [];

  const db = new Database(dbPath, { readonly: true });
  try {
    return db.prepare(`SELECT * FROM data LIMIT ?`).all(limit) as any[];
  } finally {
    db.close();
  }
}

export function getColumnStats(tableName: string): Record<string, any> {
  const dbPath = getDbPath(tableName);
  if (!fs.existsSync(dbPath)) return {};

  const db = new Database(dbPath, { readonly: true });
  try {
    const cols = db.prepare("PRAGMA table_info(data)").all() as any[];
    const stats: Record<string, any> = {};

    for (const col of cols) {
      if (col.name === "id") continue;

      if (col.type === "REAL") {
        const result = db.prepare(`
          SELECT
            MIN("${col.name}") as min_val,
            MAX("${col.name}") as max_val,
            AVG("${col.name}") as avg_val,
            SUM("${col.name}") as sum_val,
            COUNT("${col.name}") as count_val
          FROM data
          WHERE "${col.name}" IS NOT NULL
        `).get() as any;
        stats[col.name] = { type: "numeric", ...result };
      } else {
        const distinctCount = (db.prepare(`SELECT COUNT(DISTINCT "${col.name}") as cnt FROM data WHERE "${col.name}" IS NOT NULL`).get() as any).cnt;
        const topValues = db.prepare(`SELECT "${col.name}" as val, COUNT(*) as cnt FROM data WHERE "${col.name}" IS NOT NULL GROUP BY "${col.name}" ORDER BY cnt DESC LIMIT 10`).all();
        stats[col.name] = { type: "text", distinctCount, topValues };
      }
    }

    return stats;
  } finally {
    db.close();
  }
}
