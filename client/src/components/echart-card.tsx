import { useMemo, useRef, memo } from "react";
import ReactECharts from "echarts-for-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Maximize2, Plus } from "lucide-react";
import type { ChartConfig } from "@shared/schema";
import { useState } from "react";

const CHART_COLORS = [
  "#c94d7a",
  "#8b5fbd",
  "#b7508a",
  "#d44d6e",
  "#a34d8f",
  "#3c8dbc",
  "#3d9970",
  "#d4a520",
];

const GRADIENT_PAIRS = CHART_COLORS.map((c) => {
  const lighter = c.replace(/[0-9a-f]{2}$/i, (m) =>
    Math.min(255, parseInt(m, 16) + 60).toString(16).padStart(2, "0")
  );
  return [c, lighter];
});

type ChartType = "bar" | "line" | "pie" | "area" | "scatter";

interface EChartCardProps {
  chart: ChartConfig;
  onSliceClick?: (data: Record<string, unknown>) => void;
  onRemove?: () => void;
  onChartTypeChange?: (newType: ChartType) => void;
  onAddToDashboard?: (chart: ChartConfig) => void;
  compact?: boolean;
  showControls?: boolean;
  noCard?: boolean;
  fillHeight?: boolean;
}

export const EChartCard = memo(function EChartCard({
  chart,
  onSliceClick,
  onRemove,
  onChartTypeChange,
  onAddToDashboard,
  compact = false,
  showControls = true,
  noCard = false,
  fillHeight = false,
}: EChartCardProps) {
  const [chartType, setChartType] = useState<ChartType>(chart.type as ChartType);
  const chartRef = useRef<ReactECharts>(null);

  const handleTypeChange = (newType: ChartType) => {
    setChartType(newType);
    onChartTypeChange?.(newType);
  };

  const getOption = useMemo(() => {
    const type = chartType || chart.type;
    const data = chart.data || [];
    const xKey = chart.xKey;
    const yKeys = chart.yKeys;
    const categories = data.map((d: any) => String(d[xKey] ?? ""));

    const baseTextStyle = {
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: 11,
    };

    const tooltipConfig = {
      trigger: type === "pie" ? "item" : "axis",
      backgroundColor: "rgba(255,255,255,0.95)",
      borderColor: "#e5e5e5",
      borderWidth: 1,
      textStyle: { fontSize: 11, color: "#333" },
      extraCssText: "border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.08);",
    };

    if (type === "bar") {
      return {
        tooltip: tooltipConfig,
        grid: { left: 48, right: 16, top: 28, bottom: compact ? 24 : 48 },
        xAxis: {
          type: "category",
          data: categories,
          axisLabel: { ...baseTextStyle, rotate: categories.length > 8 ? 30 : 0 },
          axisLine: { lineStyle: { color: "#ddd" } },
        },
        yAxis: {
          type: "value",
          axisLabel: baseTextStyle,
          splitLine: { lineStyle: { type: "dashed", color: "#eee" } },
        },
        legend: compact ? undefined : { bottom: 0, textStyle: baseTextStyle },
        series: yKeys.map((key: string, i: number) => ({
          name: key,
          type: "bar",
          data: data.map((d: any) => d[key]),
          barMaxWidth: 36,
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: GRADIENT_PAIRS[i % GRADIENT_PAIRS.length][1] },
                { offset: 1, color: GRADIENT_PAIRS[i % GRADIENT_PAIRS.length][0] },
              ],
            },
            shadowColor: "rgba(0,0,0,0.12)",
            shadowBlur: 6,
            shadowOffsetY: 3,
          },
          emphasis: {
            itemStyle: {
              shadowColor: "rgba(0,0,0,0.2)",
              shadowBlur: 10,
              shadowOffsetY: 4,
            },
          },
        })),
      };
    }

    if (type === "pie") {
      const pieData = data.map((d: any, i: number) => ({
        name: String(d[xKey] ?? ""),
        value: d[yKeys[0]],
        itemStyle: {
          color: {
            type: "radial",
            x: 0.5, y: 0.4, r: 0.7,
            colorStops: [
              { offset: 0, color: GRADIENT_PAIRS[i % GRADIENT_PAIRS.length][1] },
              { offset: 1, color: GRADIENT_PAIRS[i % GRADIENT_PAIRS.length][0] },
            ],
          },
          shadowColor: "rgba(0,0,0,0.15)",
          shadowBlur: 8,
          shadowOffsetY: 3,
          borderColor: "#fff",
          borderWidth: 2,
        },
      }));

      return {
        tooltip: { ...tooltipConfig, trigger: "item" },
        legend: compact ? undefined : {
          bottom: 0,
          textStyle: baseTextStyle,
          type: "scroll",
        },
        series: [
          {
            type: "pie",
            radius: compact ? ["30%", "60%"] : ["35%", "65%"],
            center: ["50%", compact ? "48%" : "45%"],
            data: pieData,
            roseType: "radius",
            label: compact ? { show: false } : {
              formatter: "{b}: {d}%",
              fontSize: 10,
            },
            labelLine: { smooth: true },
            emphasis: {
              scaleSize: 8,
              itemStyle: {
                shadowColor: "rgba(0,0,0,0.25)",
                shadowBlur: 14,
              },
            },
            animationType: "scale",
            animationEasing: "elasticOut",
          },
        ],
      };
    }

    if (type === "line" || type === "area") {
      return {
        tooltip: tooltipConfig,
        grid: { left: 48, right: 16, top: 28, bottom: compact ? 24 : 48 },
        xAxis: {
          type: "category",
          data: categories,
          axisLabel: baseTextStyle,
          axisLine: { lineStyle: { color: "#ddd" } },
          boundaryGap: false,
        },
        yAxis: {
          type: "value",
          axisLabel: baseTextStyle,
          splitLine: { lineStyle: { type: "dashed", color: "#eee" } },
        },
        legend: compact ? undefined : { bottom: 0, textStyle: baseTextStyle },
        series: yKeys.map((key: string, i: number) => ({
          name: key,
          type: "line",
          data: data.map((d: any) => d[key]),
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: {
            width: 3,
            shadowColor: CHART_COLORS[i % CHART_COLORS.length] + "40",
            shadowBlur: 6,
            shadowOffsetY: 3,
          },
          itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
          areaStyle: type === "area" ? {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: CHART_COLORS[i % CHART_COLORS.length] + "30" },
                { offset: 1, color: CHART_COLORS[i % CHART_COLORS.length] + "05" },
              ],
            },
          } : undefined,
        })),
      };
    }

    if (type === "scatter") {
      return {
        tooltip: { ...tooltipConfig, trigger: "item" },
        grid: { left: 48, right: 16, top: 28, bottom: compact ? 24 : 48 },
        xAxis: {
          type: "value",
          name: xKey,
          nameTextStyle: baseTextStyle,
          axisLabel: baseTextStyle,
          splitLine: { lineStyle: { type: "dashed", color: "#eee" } },
        },
        yAxis: {
          type: "value",
          name: yKeys[0],
          nameTextStyle: baseTextStyle,
          axisLabel: baseTextStyle,
          splitLine: { lineStyle: { type: "dashed", color: "#eee" } },
        },
        series: [
          {
            type: "scatter",
            data: data.map((d: any) => [d[xKey], d[yKeys[0]]]),
            symbolSize: 10,
            itemStyle: {
              color: {
                type: "radial",
                x: 0.4, y: 0.3, r: 0.8,
                colorStops: [
                  { offset: 0, color: GRADIENT_PAIRS[0][1] },
                  { offset: 1, color: GRADIENT_PAIRS[0][0] },
                ],
              },
              shadowColor: "rgba(0,0,0,0.15)",
              shadowBlur: 4,
              shadowOffsetY: 2,
            },
            emphasis: {
              itemStyle: {
                shadowColor: "rgba(0,0,0,0.25)",
                shadowBlur: 10,
              },
            },
          },
        ],
      };
    }

    return {};
  }, [chart, chartType, compact]);

  const handleChartClick = (params: any) => {
    if (onSliceClick && params?.data) {
      const payload = typeof params.data === "object" ? params.data : { value: params.data, name: params.name };
      onSliceClick(payload);
    }
  };

  const chartHeight = fillHeight ? "100%" : compact ? 200 : 280;

  const content = (
    <>
      {!noCard && (
        <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
          <h3 className="text-sm font-medium flex-1 min-w-0">{chart.title}</h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            {onAddToDashboard && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => onAddToDashboard(chart)}
                data-testid="button-add-to-dashboard"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add to Dashboard
              </Button>
            )}
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
      )}
      {noCard && showControls && !compact && (
        <div className="flex items-center gap-1 justify-end px-3 pt-1">
          <Select value={chartType} onValueChange={(v) => handleTypeChange(v as ChartType)}>
            <SelectTrigger className="h-7 text-xs w-[90px]" data-testid="select-chart-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">Bar</SelectItem>
              <SelectItem value="line">Line</SelectItem>
              <SelectItem value="pie">Pie</SelectItem>
              <SelectItem value="area">Area</SelectItem>
              <SelectItem value="scatter">Scatter</SelectItem>
            </SelectContent>
          </Select>
          {onRemove && (
            <Button size="icon" variant="ghost" onClick={onRemove} className="flex-shrink-0" data-testid="button-remove-chart">
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      )}
      <div className={noCard ? "flex-1 min-h-0 px-2 pb-2" : ""} style={fillHeight ? { height: "100%" } : undefined}>
        <ReactECharts
          ref={chartRef}
          option={getOption}
          style={{ height: chartHeight, width: "100%" }}
          onEvents={{ click: handleChartClick }}
          opts={{ renderer: "canvas" }}
          notMerge
          lazyUpdate
        />
      </div>
      {chart.explanation && !noCard && (
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{chart.explanation}</p>
      )}
    </>
  );

  if (noCard) {
    return <div className="h-full flex flex-col" data-testid={`card-echart-${chart.title.toLowerCase().replace(/\s+/g, "-")}`}>{content}</div>;
  }

  return (
    <Card className="p-4" data-testid={`card-echart-${chart.title.toLowerCase().replace(/\s+/g, "-")}`}>
      {content}
    </Card>
  );
});
