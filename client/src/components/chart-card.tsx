import { Card } from "@/components/ui/card";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { ChartConfig } from "@shared/schema";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const CHART_COLORS = [
  "hsl(330, 60%, 45%)",
  "hsl(280, 55%, 50%)",
  "hsl(310, 58%, 48%)",
  "hsl(350, 62%, 48%)",
  "hsl(320, 56%, 45%)",
  "hsl(200, 60%, 50%)",
  "hsl(160, 50%, 45%)",
  "hsl(40, 70%, 50%)",
];

interface ChartCardProps {
  chart: ChartConfig;
  onSliceClick?: (data: Record<string, unknown>) => void;
  compact?: boolean;
}

export function ChartCard({ chart, onSliceClick, compact = false }: ChartCardProps) {
  const colors = chart.colors || CHART_COLORS;
  const height = compact ? 200 : 280;

  const handleClick = (data: any) => {
    if (onSliceClick && data) {
      const payload = data.activePayload?.[0]?.payload || data.payload || data;
      onSliceClick(payload);
    }
  };

  const renderChart = () => {
    switch (chart.type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chart.data} onClick={handleClick}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={chart.xKey} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              />
              {!compact && <Legend wrapperStyle={{ fontSize: "12px" }} />}
              {chart.yKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={colors[i % colors.length]}
                  radius={[3, 3, 0, 0]}
                  cursor="pointer"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chart.data} onClick={handleClick}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={chart.xKey} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              />
              {!compact && <Legend wrapperStyle={{ fontSize: "12px" }} />}
              {chart.yKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[i % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  cursor="pointer"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={chart.data}
                dataKey={chart.yKeys[0]}
                nameKey={chart.xKey}
                cx="50%"
                cy="50%"
                outerRadius={compact ? 70 : 90}
                label={!compact ? ({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%` : false}
                labelLine={!compact}
                cursor="pointer"
                onClick={(entry: any) => onSliceClick?.(entry)}
              >
                {chart.data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              />
              {!compact && <Legend wrapperStyle={{ fontSize: "12px" }} />}
            </PieChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chart.data} onClick={handleClick}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={chart.xKey} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              />
              {!compact && <Legend wrapperStyle={{ fontSize: "12px" }} />}
              {chart.yKeys.map((key, i) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  fill={colors[i % colors.length]}
                  fillOpacity={0.15}
                  stroke={colors[i % colors.length]}
                  strokeWidth={2}
                  cursor="pointer"
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            Unsupported chart type
          </div>
        );
    }
  };

  return (
    <Card className="p-4" data-testid={`card-chart-${chart.title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
        <h3 className="text-sm font-medium flex-1 min-w-0">{chart.title}</h3>
        {onSliceClick && (
          <Button size="icon" variant="ghost" className="flex-shrink-0" data-testid="button-expand-chart">
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
      {renderChart()}
      {chart.explanation && (
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{chart.explanation}</p>
      )}
    </Card>
  );
}
