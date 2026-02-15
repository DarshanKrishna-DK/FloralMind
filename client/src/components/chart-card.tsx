import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { ChartConfig } from "@shared/schema";
import { Maximize2, X } from "lucide-react";

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

type ChartType = "bar" | "line" | "pie" | "area" | "scatter";

interface ChartCardProps {
  chart: ChartConfig;
  onSliceClick?: (data: Record<string, unknown>) => void;
  onRemove?: () => void;
  onChartTypeChange?: (newType: ChartType) => void;
  compact?: boolean;
  showControls?: boolean;
}

export function ChartCard({ chart, onSliceClick, onRemove, onChartTypeChange, compact = false, showControls = true }: ChartCardProps) {
  const [chartType, setChartType] = useState<ChartType>(chart.type as ChartType);
  const colors = chart.colors || CHART_COLORS;
  const height = compact ? 200 : 280;

  const handleTypeChange = (newType: ChartType) => {
    setChartType(newType);
    onChartTypeChange?.(newType);
  };

  const handleClick = (data: any) => {
    if (onSliceClick && data) {
      const payload = data.activePayload?.[0]?.payload || data.payload || data;
      onSliceClick(payload);
    }
  };

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "6px",
    fontSize: "12px",
  };

  const renderChart = () => {
    const type = chartType || chart.type;

    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chart.data} onClick={handleClick}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={chart.xKey} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={tooltipStyle} />
              {!compact && <Legend wrapperStyle={{ fontSize: "12px" }} />}
              {chart.yKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[3, 3, 0, 0]} cursor="pointer" />
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
              <Tooltip contentStyle={tooltipStyle} />
              {!compact && <Legend wrapperStyle={{ fontSize: "12px" }} />}
              {chart.yKeys.map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} strokeWidth={2} dot={{ r: 3 }} cursor="pointer" />
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
                cx="50%" cy="50%"
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
              <Tooltip contentStyle={tooltipStyle} />
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
              <Tooltip contentStyle={tooltipStyle} />
              {!compact && <Legend wrapperStyle={{ fontSize: "12px" }} />}
              {chart.yKeys.map((key, i) => (
                <Area key={key} type="monotone" dataKey={key} fill={colors[i % colors.length]} fillOpacity={0.15} stroke={colors[i % colors.length]} strokeWidth={2} cursor="pointer" />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case "scatter":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ScatterChart onClick={handleClick}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={chart.xKey} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" name={chart.xKey} />
              <YAxis dataKey={chart.yKeys[0]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" name={chart.yKeys[0]} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
              {!compact && <Legend wrapperStyle={{ fontSize: "12px" }} />}
              <Scatter name={chart.title} data={chart.data} fill={colors[0]} cursor="pointer" />
            </ScatterChart>
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
        <div className="flex items-center gap-1 flex-shrink-0">
          {showControls && !compact && (
            <Select value={chartType} onValueChange={(v) => handleTypeChange(v as ChartType)}>
              <SelectTrigger className="h-7 text-xs w-[90px]" data-testid="select-chart-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar" data-testid="select-chart-type-bar">Bar</SelectItem>
                <SelectItem value="line" data-testid="select-chart-type-line">Line</SelectItem>
                <SelectItem value="pie" data-testid="select-chart-type-pie">Pie</SelectItem>
                <SelectItem value="area" data-testid="select-chart-type-area">Area</SelectItem>
                <SelectItem value="scatter" data-testid="select-chart-type-scatter">Scatter</SelectItem>
              </SelectContent>
            </Select>
          )}
          {onRemove && (
            <Button size="icon" variant="ghost" onClick={onRemove} className="flex-shrink-0" data-testid="button-remove-chart">
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
          {onSliceClick && !onRemove && (
            <Button size="icon" variant="ghost" className="flex-shrink-0" data-testid="button-expand-chart">
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
      {renderChart()}
      {chart.explanation && (
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{chart.explanation}</p>
      )}
    </Card>
  );
}
