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

export interface DashboardGenerationConfig {
  chartCount: number;
  layoutStyle: "executive" | "analytical" | "detailed" | "wide";
  chartDensity: "minimal" | "balanced" | "heavy";
  chartStyle: "2d" | "3d" | "flat";
}

const DEFAULT_CONFIG: DashboardGenerationConfig = {
  chartCount: 4,
  layoutStyle: "analytical",
  chartDensity: "balanced",
  chartStyle: "2d",
};

function getLayoutInstructions(config: DashboardGenerationConfig): string {
  const { chartCount, layoutStyle } = config;
  let instructions = `Generate exactly ${chartCount} charts.\n`;
  instructions += `Each chart MUST include a "grid_position" object with {x, y, w, h} for a 12-column grid layout.\n`;

  switch (layoutStyle) {
    case "executive":
      instructions += `Layout: Executive - Place the first 2 charts at w=6,h=5 on the top row (y=0). Place remaining charts at w=6,h=4 in rows below (y=5, y=9, etc).`;
      break;
    case "analytical":
      instructions += `Layout: Analytical - Even balanced grid. All charts same size. Use w=6,h=4 for 2-column or w=4,h=4 for 3-column depending on count.`;
      break;
    case "detailed":
      instructions += `Layout: Detailed - Compact rows with smaller charts. Use w=4,h=3 or w=3,h=3 packed tightly in rows.`;
      break;
    case "wide":
      instructions += `Layout: Wide Focus - First chart is a large hero: w=12,h=5,x=0,y=0. All remaining charts use w=6,h=4 below it.`;
      break;
  }
  return instructions;
}

function getDensityInstructions(density: DashboardGenerationConfig["chartDensity"]): string {
  switch (density) {
    case "minimal":
      return "Use LIMIT 5-8 in SQL queries. Keep data clean and minimal with fewer data points/groups.";
    case "balanced":
      return "Use LIMIT 10-15 in SQL queries. Standard level of detail.";
    case "heavy":
      return "Use LIMIT 15-25 in SQL queries. Include more data points, groups, and detail.";
  }
}

function getStyleInstructions(style: DashboardGenerationConfig["chartStyle"]): string {
  switch (style) {
    case "2d":
      return 'Use standard professional chart types: bar, line, area, pie. Choose the type that best represents each data relationship.';
    case "3d":
      return 'Use chart types that look good with 3D depth effects: bar, pie, area preferred. The frontend will apply gradient and shadow effects to create subtle 3D depth. Prefer pie charts for categorical data and bar charts for comparisons.';
    case "flat":
      return 'Prefer simpler chart types: bar and line primarily. Avoid pie charts. Keep visualizations clean and flat.';
  }
}

export async function generateDashboard(
  tableName: string,
  columns: ColumnInfo[],
  rowCount: number,
  config?: Partial<DashboardGenerationConfig>
): Promise<{ metrics: DashboardMetric[]; charts: (ChartConfig & { grid_position?: { x: number; y: number; w: number; h: number } })[]; suggestions: string[] }> {
  const cfg: DashboardGenerationConfig = { ...DEFAULT_CONFIG, ...config };
  const dataContext = buildDataContext(tableName, columns, rowCount);

  const layoutInstr = getLayoutInstructions(cfg);
  const densityInstr = getDensityInstructions(cfg.chartDensity);
  const styleInstr = getStyleInstructions(cfg.chartStyle);

  const prompt = `You are a data analytics expert. Given this dataset, generate an initial dashboard.

${dataContext}

${layoutInstr}
${densityInstr}
${styleInstr}

Generate a JSON response with:
1. "metrics" - array of 3-4 key summary metrics. Each: { "label": string, "value": string/number, "icon": "dollar"|"users"|"package"|"chart"|"hash" }
2. "charts" - array of exactly ${cfg.chartCount} charts. Each: { "type": "bar"|"line"|"pie"|"area", "title": string, "xKey": string, "yKeys": [string], "explanation": string, "grid_position": {"x": number, "y": number, "w": number, "h": number} }
   For each chart, also include "sql" - a valid SQLite SELECT query against table "data" to get the chart data. Use actual column names from the SQLite table. Group, aggregate, and limit results appropriately.
3. "suggestions" - array of 4-5 natural language questions a user might ask about this data

Rules:
- Use only actual column names from the dataset
- SQL must be valid SQLite syntax querying the "data" table
- For metrics, compute values from dataset statistics provided
- Choose chart types that best represent the data relationships
- Make suggestions specific to this dataset
- Keep chart titles concise
- Every chart MUST have a grid_position with x, y, w, h values for a 12-column grid

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

    const charts: (ChartConfig & { grid_position?: { x: number; y: number; w: number; h: number } })[] = [];
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
            grid_position: chartDef.grid_position || undefined,
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

export async function generateReport(
  tableName: string,
  columns: ColumnInfo[],
  rowCount: number,
  metrics: DashboardMetric[],
  chartTitles: string[]
): Promise<string> {
  const dataContext = buildDataContext(tableName, columns, rowCount);

  const prompt = `You are a senior data analyst preparing a comprehensive report. Generate a detailed, professional dashboard report based on this dataset and the dashboard that was created from it.

${dataContext}

Dashboard metrics: ${JSON.stringify(metrics)}
Charts on the dashboard: ${chartTitles.join(", ")}

Write a well-structured report with:
1. Executive Summary - Key takeaways in 2-3 sentences
2. Dataset Overview - What the data contains, its scope and coverage
3. Key Metrics Analysis - Analyze each metric and what it tells us
4. Visualization Insights - What each chart reveals about the data
5. Patterns & Trends - Important patterns discovered
6. Recommendations - 3-5 actionable recommendations based on the data
7. Data Quality Notes - Any observations about data completeness or quality

Format the report in clean Markdown. Be specific with numbers and percentages from the actual data. Make the analysis professional and actionable.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return text;
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
  "hypothesis": "If drilling into data, provide a hypothesis" or null,
  "confidence": 4.2
}

Rules:
- Use only actual column names from the SQLite table
- SQL must be valid SQLite syntax against table "data"
- Limit query results to max 20 rows
- Always provide meaningful analysis in "message"
- Chart is optional - only include when visualization adds value
- Be conversational and insightful
- "confidence" is a score from 1.0 to 5.0 rating how confident you are in your analysis accuracy. Consider: data quality, query complexity, whether the question maps well to available columns, and result completeness. 1=very low confidence, 5=very high confidence.

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

    let confidence = parsed.confidence;
    if (typeof confidence === "number") {
      confidence = Math.max(1, Math.min(5, Math.round(confidence * 10) / 10));
    }

    return {
      message: parsed.message || "I analyzed your data but couldn't generate specific insights.",
      chart,
      suggestions: parsed.suggestions || [],
      hypothesis: parsed.hypothesis,
      confidence: confidence || undefined,
    };
  } catch (err) {
    console.error("Failed to parse AI query response:", err, "Raw text:", text.slice(0, 200));
    return {
      message: text || "I had trouble processing that request. Could you rephrase your question?",
      suggestions: ["Show me a data summary", "What patterns exist in this data?"],
    };
  }
}
