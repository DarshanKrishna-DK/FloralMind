import { createClient } from "@supabase/supabase-js";
import type { ColumnInfo } from "@shared/schema";
import { createTableFromCSV, detectSchema } from "./sqlite-manager";

interface SupabaseTableInfo {
  name: string;
  schema: string;
  rowCount: number | null;
}

export async function discoverSupabaseTables(
  url: string,
  key: string
): Promise<SupabaseTableInfo[]> {
  const cleanUrl = url.replace(/\/+$/, "");

  const openApiRes = await fetch(`${cleanUrl}/rest/v1/`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  if (!openApiRes.ok) {
    throw new Error(
      "Could not connect to Supabase. Please check your project URL and API key are correct."
    );
  }

  const spec = await openApiRes.json();

  const tableNames: string[] = [];

  if (spec && spec.definitions) {
    for (const defName of Object.keys(spec.definitions)) {
      if (!defName.startsWith("_") && defName !== "rpc") {
        tableNames.push(defName);
      }
    }
  } else if (spec && spec.paths) {
    for (const pathKey of Object.keys(spec.paths)) {
      const name = pathKey.replace(/^\//, "").split("?")[0];
      if (name && !name.startsWith("_") && name !== "rpc") {
        tableNames.push(name);
      }
    }
  }

  if (tableNames.length === 0) {
    throw new Error(
      "No accessible tables found. Ensure your Supabase project has tables in the public schema and the API key has proper permissions."
    );
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  const results: SupabaseTableInfo[] = [];

  const countPromises = tableNames.map(async (name) => {
    try {
      const { count, error } = await supabase
        .from(name)
        .select("*", { count: "exact", head: true });

      results.push({
        name,
        schema: "public",
        rowCount: error ? null : (count ?? null),
      });
    } catch {
      results.push({
        name,
        schema: "public",
        rowCount: null,
      });
    }
  });

  await Promise.all(countPromises);

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getSupabaseTableData(
  url: string,
  key: string,
  tableName: string,
  limit = 10000
): Promise<{ headers: string[]; rows: string[][]; totalCount: number }> {
  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  const { count, error: countError } = await supabase
    .from(tableName)
    .select("*", { count: "exact", head: true });

  if (countError) {
    throw new Error(`Cannot access table "${tableName}": ${countError.message}`);
  }

  const totalCount = count ?? 0;
  const fetchLimit = Math.min(limit, totalCount);

  const allRows: any[] = [];
  const pageSize = 1000;

  for (let offset = 0; offset < fetchLimit; offset += pageSize) {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .range(offset, Math.min(offset + pageSize - 1, fetchLimit - 1));

    if (error) {
      throw new Error(`Failed to fetch data from "${tableName}": ${error.message}`);
    }

    if (data && data.length > 0) {
      allRows.push(...data);
    } else {
      break;
    }
  }

  if (allRows.length === 0) {
    throw new Error(`Table "${tableName}" is empty or has no accessible rows.`);
  }

  const headers = Object.keys(allRows[0]);
  const rows = allRows.map((row) =>
    headers.map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return "";
      if (typeof val === "object") return JSON.stringify(val);
      return String(val);
    })
  );

  return { headers, rows, totalCount };
}

export async function importSupabaseTable(
  url: string,
  key: string,
  tableName: string
): Promise<{
  localTableName: string;
  rowCount: number;
  columns: ColumnInfo[];
  datasetName: string;
}> {
  const { headers, rows } = await getSupabaseTableData(url, key, tableName);

  const columns = detectSchema(headers, rows);
  const datasetName = `supabase_${tableName}`;

  const { tableName: localTableName, rowCount } = createTableFromCSV(
    datasetName,
    headers,
    rows,
    columns
  );

  return {
    localTableName,
    rowCount,
    columns,
    datasetName,
  };
}
