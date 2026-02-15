import Anthropic from "@anthropic-ai/sdk";
import type { ChartConfig, DashboardMetric, ColumnInfo, AIResponse } from "@shared/schema";
import { queryDataset, getColumnStats, getSampleData, getTableColumns } from "./sqlite-manager";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

function buildDataContext(
  tableName: string,
  columns: ColumnInfo[],
  rowCount: number
): string {
  const stats = getColumnStats(tableName);
  const sampleRows = getSampleData(tableName, 3);
  const dbColumns = getTableColumns(tableName);

  let context = `Dataset has ${rowCount} rows and the following columns in the SQLite table "data":\n`;

  for (const col of columns) {
    const sanitizedName = col.name.trim().replace(/[^a-zA-Z0-9_]/g, "_").replace(/^(\d)/, "_$1").toLowerCase();
    context += `- "${sanitizedName}" (${col.type})`;
    if (stats[sanitizedName]) {
      const s = stats[sanitizedName];
      if (s.type === "numeric") {
        context += ` | min: ${s.min_val}, max: ${s.max_val}, avg: ${Number(s.avg_val).toFixed(2)}, sum: ${Number(s.sum_val).toFixed(2)}`;
      } else {
        context += ` | ${s.distinctCount} unique values, top: ${(s.topValues || []).slice(0, 5).map((v: any) => `${v.val}(${v.cnt})`).join(", ")}`;
      }
    }
    context += "\n";
  }

  if (sampleRows.length > 0) {
    context += `\nSample rows:\n${JSON.stringify(sampleRows.slice(0, 3), null, 2)}`;
  }

  context += `\n\nActual column names in SQLite: ${dbColumns.map(c => `"${c}"`).join(", ")}`;

  return context;
}

export async function generateDashboard(
  tableName: string,
  columns: ColumnInfo[],
  rowCount: number
): Promise<{ metrics: DashboardMetric[]; charts: ChartConfig[]; suggestions: string[] }> {
  const dataContext = buildDataContext(tableName, columns, rowCount);

  const prompt = `You are a data analytics expert. Given this dataset, generate an initial dashboard.

${dataContext}

Generate a JSON response with:
1. "metrics" - array of 3-4 key summary metrics. Each: { "label": string, "value": string/number, "icon": "dollar"|"users"|"package"|"chart"|"hash" }
2. "charts" - array of 2-4 charts. Each: { "type": "bar"|"line"|"pie"|"area", "title": string, "xKey": string, "yKeys": [string], "explanation": string }
   For each chart, also include "sql" - a valid SQLite SELECT query against table "data" to get the chart data. Use actual column names from the SQLite table. Group, aggregate, and limit results appropriately (max 15 rows for readability).
3. "suggestions" - array of 4-5 natural language questions a user might ask about this data

Rules:
- Use only actual column names from the dataset
- SQL must be valid SQLite syntax querying the "data" table
- For metrics, compute values from dataset statistics provided
- Choose chart types that best represent the data relationships
- Make suggestions specific to this dataset
- Keep chart titles concise

Return ONLY valid JSON, no markdown or explanation.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    const charts: ChartConfig[] = [];
    for (const chartDef of parsed.charts || []) {
      try {
        if (chartDef.sql) {
          const result = queryDataset(tableName, chartDef.sql);
          charts.push({
            type: chartDef.type,
            title: chartDef.title,
            data: result.rows,
            xKey: chartDef.xKey,
            yKeys: chartDef.yKeys,
            explanation: chartDef.explanation,
          });
        }
      } catch (err) {
        console.error(`Chart query failed for "${chartDef.title}":`, err);
      }
    }

    return {
      metrics: parsed.metrics || [],
      charts,
      suggestions: parsed.suggestions || [],
    };
  } catch (err) {
    console.error("Failed to parse AI dashboard response:", err);
    return { metrics: [], charts: [], suggestions: ["Show me a summary of this data"] };
  }
}

export async function handleQuery(
  tableName: string,
  columns: ColumnInfo[],
  rowCount: number,
  question: string,
  conversationHistory: { role: string; content: string }[] = []
): Promise<AIResponse> {
  const dataContext = buildDataContext(tableName, columns, rowCount);

  const systemPrompt = `You are FloralMind, an AI data analytics assistant. You help users explore datasets through conversation.

${dataContext}

When the user asks a question:
1. Generate a SQL query if needed (SQLite syntax, table "data", use actual column names)
2. Choose the best visualization type if applicable
3. Provide clear, insightful analysis
4. Suggest follow-up questions

Respond with JSON:
{
  "message": "Your analysis and insights in plain text",
  "sql": "SELECT query if needed, or null",
  "chart": {
    "type": "bar|line|pie|area",
    "title": "Chart title",
    "xKey": "column for x-axis",
    "yKeys": ["columns for y-axis"]
  } or null,
  "suggestions": ["2-3 follow-up questions"],
  "hypothesis": "If drilling into data, provide a hypothesis" or null
}

Rules:
- Use only actual column names from the SQLite table
- SQL must be valid SQLite syntax against table "data"
- Limit query results to max 20 rows
- Always provide meaningful analysis in "message"
- Chart is optional - only include when visualization adds value
- Be conversational and insightful

Return ONLY valid JSON.`;

  const messages: { role: "user" | "assistant"; content: string }[] = [];

  for (const msg of conversationHistory.slice(-6)) {
    messages.push({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    });
  }
  messages.push({ role: "user", content: question });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8192,
    system: systemPrompt,
    messages,
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    let chart: ChartConfig | undefined;
    if (parsed.sql && parsed.chart) {
      try {
        const result = queryDataset(tableName, parsed.sql);
        if (result.rows.length > 0) {
          chart = {
            type: parsed.chart.type,
            title: parsed.chart.title,
            data: result.rows,
            xKey: parsed.chart.xKey,
            yKeys: parsed.chart.yKeys,
            explanation: parsed.chart.explanation,
          };
        }
      } catch (err) {
        console.error("Query execution failed:", err);
      }
    }

    return {
      message: parsed.message || "I analyzed your data but couldn't generate specific insights.",
      chart,
      suggestions: parsed.suggestions || [],
      hypothesis: parsed.hypothesis,
    };
  } catch (err) {
    console.error("Failed to parse AI query response:", err, "Raw text:", text.slice(0, 200));
    return {
      message: text || "I had trouble processing that request. Could you rephrase your question?",
      suggestions: ["Show me a data summary", "What patterns exist in this data?"],
    };
  }
}
