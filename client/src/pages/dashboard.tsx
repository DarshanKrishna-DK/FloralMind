import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SidebarProvider, SidebarTrigger, Sidebar, SidebarContent,
  SidebarGroup, SidebarGroupLabel, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  BarChart3, MessageSquare, Upload, Database, Table2, Sparkles,
  Columns3, LayoutGrid, Plus, Eye, EyeOff,
  Download, FileText, PanelRightOpen, PanelRightClose, Loader2, ClipboardCopy,
  GripVertical, Image, Code, Share2, X, Grid2X2, Grid3X3, Rows3, SquareSplitHorizontal,
} from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { ChartCard } from "@/components/chart-card";
import { lazy, Suspense } from "react";
const EChartCard = lazy(() => import("@/components/echart-card").then(m => ({ default: m.EChartCard })));
import { ChatPanel } from "@/components/chat-panel";
import { ManualChartBuilder } from "@/components/manual-chart-builder";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Dataset, Message, ChartConfig, DashboardMetric, AIResponse, ColumnInfo } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { ResponsiveGridLayout as RGLBase } from "react-grid-layout";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import logoIcon from "@assets/ChatGPT_Image_Feb_15,_2026,_03_56_17_PM_1771151200056.png";

const ResponsiveGridLayout = RGLBase as any;

interface GridLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

interface LayoutTemplate {
  id: string;
  label: string;
  icon: any;
  getLayout: (count: number) => GridLayout[];
  totalRows: number;
}

function createLayoutTemplates(): LayoutTemplate[] {
  return [
    {
      id: "grid-2col",
      label: "2 Column Grid",
      icon: Grid2X2,
      totalRows: 6,
      getLayout: (count: number) => {
        return Array.from({ length: count }, (_, i) => ({
          i: String(i),
          x: (i % 2) * 6,
          y: Math.floor(i / 2) * 6,
          w: 6,
          h: 6,
          minW: 3,
          minH: 3,
        }));
      },
    },
    {
      id: "grid-3col",
      label: "3 Column Grid",
      icon: Grid3X3,
      totalRows: 4,
      getLayout: (count: number) => {
        return Array.from({ length: count }, (_, i) => ({
          i: String(i),
          x: (i % 3) * 4,
          y: Math.floor(i / 3) * 4,
          w: 4,
          h: 4,
          minW: 3,
          minH: 3,
        }));
      },
    },
    {
      id: "featured",
      label: "Featured + Grid",
      icon: SquareSplitHorizontal,
      totalRows: 6,
      getLayout: (count: number) => {
        if (count === 0) return [];
        const layouts: GridLayout[] = [
          { i: "0", x: 0, y: 0, w: 8, h: 6, minW: 4, minH: 3 },
        ];
        for (let i = 1; i < count; i++) {
          const row = Math.floor((i - 1) / 2);
          layouts.push({
            i: String(i),
            x: i === 1 ? 8 : i === 2 ? 8 : ((i - 1) % 2) * 6,
            y: i <= 2 ? (i - 1) * 3 : 6 + row * 4,
            w: i <= 2 ? 4 : 6,
            h: i <= 2 ? 3 : 4,
            minW: 3,
            minH: 3,
          });
        }
        return layouts;
      },
    },
    {
      id: "rows",
      label: "Stacked Rows",
      icon: Rows3,
      totalRows: 4,
      getLayout: (count: number) => {
        return Array.from({ length: count }, (_, i) => ({
          i: String(i),
          x: 0,
          y: i * 4,
          w: 12,
          h: 4,
          minW: 6,
          minH: 3,
        }));
      },
    },
    {
      id: "mixed",
      label: "Mixed Layout",
      icon: LayoutGrid,
      totalRows: 6,
      getLayout: (count: number) => {
        const templates: { w: number; h: number }[] = [
          { w: 6, h: 6 }, { w: 6, h: 3 }, { w: 6, h: 3 },
          { w: 4, h: 4 }, { w: 4, h: 4 }, { w: 4, h: 4 },
          { w: 6, h: 4 }, { w: 6, h: 4 },
        ];
        const layouts: GridLayout[] = [];
        let currentX = 0;
        let currentY = 0;
        let rowMaxH = 0;
        for (let i = 0; i < count; i++) {
          const t = templates[i % templates.length];
          if (currentX + t.w > 12) {
            currentX = 0;
            currentY += rowMaxH;
            rowMaxH = 0;
          }
          layouts.push({
            i: String(i),
            x: currentX,
            y: currentY,
            w: t.w,
            h: t.h,
            minW: 3,
            minH: 3,
          });
          currentX += t.w;
          rowMaxH = Math.max(rowMaxH, t.h);
        }
        return layouts;
      },
    },
  ];
}

const LAYOUT_TEMPLATES = createLayoutTemplates();

export default function DashboardPage() {
  const params = useParams<{ id: string }>();
  const datasetId = parseInt(params.id || "0");
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const initialMode = searchParams.get("mode") || "auto";

  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [confidenceScores, setConfidenceScores] = useState<Record<number, number>>({});
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [dashboardCharts, setDashboardCharts] = useState<ChartConfig[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetric[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [showManualBuilder, setShowManualBuilder] = useState(initialMode === "manual");
  const [pinnedChart, setPinnedChart] = useState<ChartConfig | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportContent, setReportContent] = useState<string>("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportPreview, setReportPreview] = useState(true);
  const [gridLayouts, setGridLayouts] = useState<{ [key: string]: GridLayout[] }>({});
  const [columnDataOpen, setColumnDataOpen] = useState(false);
  const [columnDataTitle, setColumnDataTitle] = useState("");
  const [columnData, setColumnData] = useState<Record<string, unknown>[]>([]);
  const [columnDataLoading, setColumnDataLoading] = useState(false);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [gridWidth, setGridWidth] = useState(800);
  const [selectedLayout, setSelectedLayout] = useState("grid-2col");
  const [metricsVisible, setMetricsVisible] = useState(true);
  const [chartStyle, setChartStyle] = useState<string>("2d");
  const dashboardRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const mainAreaRef = useRef<HTMLDivElement>(null);

  const { data: dataset, isLoading: datasetLoading } = useQuery<Dataset>({
    queryKey: ["/api/datasets", datasetId],
  });

  const { data: initialDashboard, isLoading: dashLoading } = useQuery<{
    metrics: DashboardMetric[];
    charts: (ChartConfig & { grid_position?: { x: number; y: number; w: number; h: number } })[];
    suggestions: string[];
  }>({
    queryKey: ["/api/datasets", datasetId, "dashboard", searchString],
    queryFn: async () => {
      const configParam = searchParams.get("config");
      let queryStr = "";
      if (configParam) {
        try {
          const parsed = JSON.parse(atob(configParam));
          queryStr = `?chartCount=${parsed.chartCount || 4}&layoutStyle=${parsed.layoutStyle || "analytical"}&chartDensity=${parsed.chartDensity || "balanced"}&chartStyle=${parsed.chartStyle || "2d"}`;
          if (parsed.chartStyle) setChartStyle(parsed.chartStyle);
        } catch {}
      }
      const res = await fetch(`/api/datasets/${datasetId}/dashboard${queryStr}`);
      if (!res.ok) throw new Error("Failed to generate dashboard");
      return res.json();
    },
    enabled: !!dataset && initialMode === "auto",
  });

  useEffect(() => {
    if (initialDashboard) {
      setDashboardMetrics(initialDashboard.metrics || []);
      setDashboardCharts(initialDashboard.charts || []);
      setSuggestions(initialDashboard.suggestions || []);

      const chartsWithPositions = (initialDashboard.charts || []).filter((c: any) => c.grid_position);
      if (chartsWithPositions.length > 0) {
        const layout = chartsWithPositions.map((c: any, i: number) => ({
          i: String(i),
          x: c.grid_position.x,
          y: c.grid_position.y,
          w: c.grid_position.w,
          h: c.grid_position.h,
          minW: 3,
          minH: 3,
        }));
        setGridLayouts(buildAllBreakpoints(layout));
      }
    }
  }, [initialDashboard]);

  useEffect(() => {
    if (dashboardCharts.length > 0 && Object.keys(gridLayouts).length === 0) {
      applyLayoutTemplate(selectedLayout, dashboardCharts.length);
    }
  }, [dashboardCharts.length]);

  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setGridWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    setGridWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (gridContainerRef.current) {
        setGridWidth(gridContainerRef.current.clientWidth);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [chatOpen]);

  const [availableHeight, setAvailableHeight] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 800
  );

  useEffect(() => {
    const handleResize = () => setAvailableHeight(window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const dynamicRowHeight = useMemo(() => {
    return 100; // Fixed row height for natural scrolling
  }, []);

  const buildAllBreakpoints = useCallback((layout: GridLayout[]) => {
    const scaleLayout = (items: GridLayout[], maxCols: number): GridLayout[] => {
      const ratio = maxCols / 12;
      const scaled: GridLayout[] = [];
      for (const l of items) {
        const w = Math.max(Math.round(l.w * ratio), l.minW || 2);
        const x = Math.min(Math.round(l.x * ratio), maxCols - w);
        scaled.push({ ...l, w, x: Math.max(0, x), minW: Math.min(l.minW || 2, maxCols) });
      }
      return scaled;
    };
    const stackLayout = (items: GridLayout[], cols: number): GridLayout[] => {
      return items.map((l, i) => ({ ...l, x: 0, y: i * (l.h || 4), w: cols, minW: 1 }));
    };
    return {
      lg: layout,
      md: scaleLayout(layout, 10),
      sm: scaleLayout(layout, 6),
      xs: stackLayout(layout, 4),
      xxs: stackLayout(layout, 2),
    };
  }, []);

  const applyLayoutTemplate = useCallback((templateId: string, chartCount: number) => {
    const template = LAYOUT_TEMPLATES.find((t) => t.id === templateId);
    if (!template || chartCount === 0) return;
    const layout = template.getLayout(chartCount);
    setGridLayouts(buildAllBreakpoints(layout));
  }, [buildAllBreakpoints]);

  const layoutVersionRef = useRef(0);
  const skipNextLayoutChange = useRef(false);

  const handleLayoutSelect = useCallback((templateId: string) => {
    setSelectedLayout(templateId);
    layoutVersionRef.current += 1;
    skipNextLayoutChange.current = true;
    applyLayoutTemplate(templateId, dashboardCharts.length);
  }, [dashboardCharts.length, applyLayoutTemplate]);

  const handleLayoutChange = useCallback((_layout: any, allLayouts: any) => {
    if (skipNextLayoutChange.current) {
      skipNextLayoutChange.current = false;
      return;
    }
    setGridLayouts(allLayouts);
  }, []);

  const addChartToGrid = useCallback((chart: ChartConfig) => {
    setDashboardCharts((prev) => {
      const newCharts = [...prev, chart];
      const template = LAYOUT_TEMPLATES.find((t) => t.id === selectedLayout);
      if (template) {
        const newLayout = template.getLayout(newCharts.length);
        setGridLayouts(buildAllBreakpoints(newLayout));
      } else {
        const newItem: GridLayout = {
          i: String(newCharts.length - 1),
          x: 0,
          y: Infinity,
          w: 6,
          h: 4,
          minW: 3,
          minH: 3,
        };
        setGridLayouts((prevLayouts) => {
          const lgLayout = [...(prevLayouts.lg || []), newItem];
          return buildAllBreakpoints(lgLayout);
        });
      }
      return newCharts;
    });
  }, [selectedLayout, buildAllBreakpoints]);

  const handleSendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: Date.now(),
      conversationId: 0,
      role: "user",
      content,
      chartData: null,
      suggestions: null,
      createdAt: new Date(),
    };
    setChatMessages((prev) => [...prev, userMessage]);
    setIsAiLoading(true);

    try {
      const res = await apiRequest("POST", `/api/datasets/${datasetId}/query`, { question: content });
      const data: AIResponse = await res.json();

      const msgId = Date.now() + 1;
      const assistantMessage: Message = {
        id: msgId,
        conversationId: 0,
        role: "assistant",
        content: data.message,
        chartData: data.chart || null,
        suggestions: data.suggestions || null,
        createdAt: new Date(),
      };
      setChatMessages((prev) => [...prev, assistantMessage]);

      if (data.confidence) {
        setConfidenceScores((prev) => ({ ...prev, [msgId]: data.confidence! }));
      }

      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch {
      const errorMessage: Message = {
        id: Date.now() + 1,
        conversationId: 0,
        role: "assistant",
        content: "Sorry, I couldn't process that request. Please try again.",
        chartData: null,
        suggestions: null,
        createdAt: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsAiLoading(false);
    }
  }, [datasetId]);

  const handleSliceClick = useCallback(async (data: Record<string, unknown>) => {
    const keys = Object.entries(data)
      .filter(([_, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}: ${v}`)
      .slice(0, 3)
      .join(", ");

    const question = `Drill deeper into this data point: ${keys}. Generate a hypothesis about why this stands out and suggest further analysis.`;
    setChatOpen(true);
    await handleSendMessage(question);
  }, [handleSendMessage]);

  const handlePinChart = useCallback((chart: ChartConfig) => {
    setPinnedChart(chart);
    setChatOpen(true);
  }, []);

  const handleRemoveChart = useCallback((index: number) => {
    setDashboardCharts((prev) => {
      const newCharts = prev.filter((_, i) => i !== index);
      const template = LAYOUT_TEMPLATES.find((t) => t.id === selectedLayout);
      if (template && newCharts.length > 0) {
        const newLayout = template.getLayout(newCharts.length);
        setGridLayouts(buildAllBreakpoints(newLayout));
      } else {
        setGridLayouts({});
      }
      return newCharts;
    });
  }, [selectedLayout, buildAllBreakpoints]);

  const handleManualChartCreated = useCallback((chart: ChartConfig) => {
    addChartToGrid(chart);
  }, [addChartToGrid]);

  const handleAddChartFromChat = useCallback((chart: ChartConfig) => {
    addChartToGrid(chart);
  }, [addChartToGrid]);

  const handleColumnClick = useCallback(async (columnName: string) => {
    setColumnDataOpen(true);
    setColumnDataTitle(columnName);
    setColumnDataLoading(true);
    setShowAllColumns(false);

    try {
      const res = await apiRequest("POST", `/api/datasets/${datasetId}/sql`, {
        sql: `SELECT "${columnName}" FROM data LIMIT 200`,
      });
      const data = await res.json();
      setColumnData(data.rows || []);
    } catch {
      setColumnData([]);
    } finally {
      setColumnDataLoading(false);
    }
  }, [datasetId]);

  const handleViewFullTable = useCallback(async () => {
    setColumnDataOpen(true);
    setColumnDataTitle("Full Table");
    setColumnDataLoading(true);
    setShowAllColumns(true);

    try {
      const res = await apiRequest("POST", `/api/datasets/${datasetId}/sql`, {
        sql: `SELECT * FROM data LIMIT 200`,
      });
      const data = await res.json();
      setColumnData(data.rows || []);
    } catch {
      setColumnData([]);
    } finally {
      setColumnDataLoading(false);
    }
  }, [datasetId]);

  const handleGenerateReport = useCallback(async () => {
    setReportOpen(true);
    setReportLoading(true);
    setReportContent("");
    setReportPreview(true);

    try {
      const res = await apiRequest("POST", `/api/datasets/${datasetId}/report`, {
        metrics: dashboardMetrics,
        chartTitles: dashboardCharts.map((c) => c.title),
      });
      const data = await res.json();
      setReportContent(data.report);
    } catch {
      setReportContent("Failed to generate report. Please try again.");
    } finally {
      setReportLoading(false);
    }
  }, [datasetId, dashboardMetrics, dashboardCharts]);

  const handleCopyReport = useCallback(() => {
    navigator.clipboard.writeText(reportContent);
  }, [reportContent]);

  const handleDownloadReport = useCallback(() => {
    const blob = new Blob([reportContent], { type: "text/markdown" });
    const link = document.createElement("a");
    link.download = `${dataset?.name || "dashboard"}-report.md`;
    link.href = URL.createObjectURL(blob);
    link.click();
  }, [reportContent, dataset]);

  const handleExportPNG = useCallback(async () => {
    try {
      const html2canvas = (await import("html2canvas")).default;
      const target = dashboardRef.current;
      if (!target) return;

      const originalOverflow = target.style.overflow;
      const originalHeight = target.style.height;
      target.style.overflow = "visible";
      target.style.height = "auto";

      const canvas = await html2canvas(target, {
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--background').trim()
          ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--background').trim()})`
          : "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: target.scrollWidth,
        windowHeight: target.scrollHeight,
        width: target.scrollWidth,
        height: target.scrollHeight,
      });

      target.style.overflow = originalOverflow;
      target.style.height = originalHeight;

      const link = document.createElement("a");
      link.download = `${dataset?.name || "dashboard"}-export.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    }
  }, [dataset]);

  const handleExportPDF = useCallback(async () => {
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const target = dashboardRef.current;
      if (!target) return;

      const originalOverflow = target.style.overflow;
      const originalHeight = target.style.height;
      target.style.overflow = "visible";
      target.style.height = "auto";

      const canvas = await html2canvas(target, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: target.scrollWidth,
        windowHeight: target.scrollHeight,
        width: target.scrollWidth,
        height: target.scrollHeight,
      });

      target.style.overflow = originalOverflow;
      target.style.height = originalHeight;

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      const isLandscape = imgWidth > imgHeight;
      const pdf = new jsPDF(isLandscape ? "l" : "p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const margin = 10;
      const usableW = pdfWidth - margin * 2;
      const usableH = pdfHeight - margin * 2;

      const scale = Math.min(usableW / imgWidth, usableH / imgHeight);
      const finalW = imgWidth * scale;
      const finalH = imgHeight * scale;

      const offsetX = (pdfWidth - finalW) / 2;
      const offsetY = margin;

      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pdfWidth, pdfHeight, "F");

      pdf.addImage(imgData, "PNG", offsetX, offsetY, finalW, finalH);

      const footerY = pdfHeight - 6;
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text(`FloralMind - ${dataset?.name || "Dashboard"} - ${new Date().toLocaleDateString()}`, pdfWidth / 2, footerY, { align: "center" });

      pdf.save(`${dataset?.name || "dashboard"}-report.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    }
  }, [dataset]);

  const handleExportCSV = useCallback(() => {
    if (!dashboardCharts.length) return;
    const allData = dashboardCharts.flatMap((chart) =>
      chart.data.map((row) => ({ chart_title: chart.title, ...row }))
    );
    if (allData.length === 0) return;

    const headers = Object.keys(allData[0]);
    const csvContent = [
      headers.join(","),
      ...allData.map((row) =>
        headers.map((h) => {
          const val = (row as any)[h];
          return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
        }).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.download = `${dataset?.name || "dashboard"}-data.csv`;
    link.href = URL.createObjectURL(blob);
    link.click();
  }, [dashboardCharts, dataset]);

  const handleExportHTML = useCallback(async () => {
    try {
      const html2canvas = (await import("html2canvas")).default;
      const target = dashboardRef.current;
      if (!target) return;

      const originalOverflow = target.style.overflow;
      const originalHeight = target.style.height;
      target.style.overflow = "visible";
      target.style.height = "auto";

      const canvas = await html2canvas(target, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: target.scrollWidth,
        windowHeight: target.scrollHeight,
        width: target.scrollWidth,
        height: target.scrollHeight,
      });

      target.style.overflow = originalOverflow;
      target.style.height = originalHeight;

      const imgData = canvas.toDataURL("image/png");
      const name = dataset?.name || "Dashboard";

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - FloralMind Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #faf5f5; color: #1a1a1a; }
    .header { background: linear-gradient(135deg, #d946a8, #8b5cf6); color: white; padding: 24px 32px; }
    .header h1 { font-size: 24px; font-weight: 700; }
    .header p { font-size: 14px; opacity: 0.85; margin-top: 4px; }
    .content { max-width: 1400px; margin: 32px auto; padding: 0 24px; }
    .dashboard-img { width: 100%; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .footer { text-align: center; padding: 32px; color: #888; font-size: 12px; }
    .metrics { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
    .metric { flex: 1; min-width: 160px; background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
    .metric .label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .metric .value { font-size: 24px; font-weight: 700; margin-top: 4px; }
    .metric .change { font-size: 12px; color: #22c55e; margin-top: 2px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${name}</h1>
    <p>Generated by FloralMind - Dashboards that think</p>
  </div>
  <div class="content">
    ${dashboardMetrics.length > 0 ? `<div class="metrics">${dashboardMetrics.map(m => `<div class="metric"><div class="label">${m.label}</div><div class="value">${m.value}</div>${m.change ? `<div class="change">${m.change}</div>` : ""}</div>`).join("")}</div>` : ""}
    <img src="${imgData}" alt="${name}" class="dashboard-img" />
  </div>
  <div class="footer">
    FloralMind &mdash; Dashboards that think &mdash; Generated ${new Date().toLocaleDateString()}
  </div>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: "text/html" });
      const link = document.createElement("a");
      link.download = `${name}-dashboard.html`;
      link.href = URL.createObjectURL(blob);
      link.click();
    } catch (err) {
      console.error("HTML export failed:", err);
    }
  }, [dataset, dashboardMetrics]);

  const currentLayouts = useMemo(() => {
    if (Object.keys(gridLayouts).length > 0) return gridLayouts;
    const template = LAYOUT_TEMPLATES.find((t) => t.id === selectedLayout);
    if (template) {
      const layout = template.getLayout(dashboardCharts.length);
      return buildAllBreakpoints(layout);
    }
    return { lg: [], md: [], sm: [], xs: [], xxs: [] };
  }, [gridLayouts, dashboardCharts.length, selectedLayout, buildAllBreakpoints]);

  const sidebarStyle = {
    "--sidebar-width": "14rem",
    "--sidebar-width-icon": "3rem",
  };

  if (datasetLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Sparkles className="w-8 h-8 text-primary mx-auto animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading dataset...</p>
        </div>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-6 text-center max-w-sm">
          <Database className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h2 className="font-medium mb-1">Dataset not found</h2>
          <p className="text-sm text-muted-foreground mb-4">This dataset may have been removed.</p>
          <Button onClick={() => navigate("/upload")} data-testid="button-go-home">
            <Upload className="w-4 h-4 mr-2" /> Upload New Dataset
          </Button>
        </Card>
      </div>
    );
  }

  const columns = dataset.columns as ColumnInfo[];

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <div className="px-3 py-3 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-indigo-500/5 dark:from-pink-500/10 dark:via-purple-500/10 dark:to-indigo-500/10 rounded-md mx-2">
                <div className="flex items-center gap-2 mb-1">
                  <img src={logoIcon} alt="FloralMind" className="w-6 h-6" />
                  <span className="text-sm font-semibold bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 bg-clip-text text-transparent">FloralMind</span>
                </div>
                <span className="text-[10px] text-muted-foreground italic">Dashboards that think</span>
              </div>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Dataset</SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs truncate">{dataset.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Table2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs">{dataset.rowCount} rows</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Columns3 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs">{columns.length} columns</span>
                  </div>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>

                <SidebarGroup>
              <SidebarGroupLabel>Columns</SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-1 space-y-0.5 max-h-[30vh] overflow-y-auto">
                  {columns.map((col) => (
                    <SidebarMenu key={col.name}>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => {
                            console.log("Column clicked:", col.name);
                            handleColumnClick(col.name);
                          }}
                          data-testid={`column-${col.name}`}
                          className="py-1 w-full justify-start gap-2 hover:bg-primary/5 transition-colors"
                        >
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex-shrink-0 min-w-[32px] justify-center">
                            {col.type === "numeric" ? "num" : col.type === "date" ? "date" : "txt"}
                          </Badge>
                          <span className="text-xs truncate font-medium">{col.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  ))}
                </div>
                <div className="px-2 pt-2 border-t mt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs justify-start"
                    onClick={handleViewFullTable}
                    data-testid="button-view-full-table"
                  >
                    <Table2 className="w-3 h-3 mr-1" />
                    View Full Table
                  </Button>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Layout</SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-2 grid grid-cols-3 gap-1">
                  {LAYOUT_TEMPLATES.map((template) => {
                    const Icon = template.icon;
                    return (
                      <Button
                        key={template.id}
                        variant={selectedLayout === template.id ? "default" : "ghost"}
                        size="sm"
                        className="flex flex-col items-center gap-0.5 h-auto py-2 px-1 text-[10px]"
                        onClick={() => handleLayoutSelect(template.id)}
                        data-testid={`button-layout-${template.id}`}
                        title={template.label}
                      >
                        <Icon className="w-4 h-4" />
                      </Button>
                    );
                  })}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>

            <div className="mt-auto p-3 space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => setShowManualBuilder(!showManualBuilder)}
                data-testid="button-toggle-builder"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                {showManualBuilder ? "Hide Builder" : "Add Chart"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => navigate("/upload")}
                data-testid="button-new-dataset"
              >
                <Upload className="w-3.5 h-3.5 mr-1" />
                New Dataset
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-col flex-1 min-w-0">
          <header className="sticky top-0 z-50 bg-background border-b flex-shrink-0">
            <div className="h-[2px] w-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />
            <div className="flex items-center justify-between gap-2 px-4 py-2">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-sm font-semibold truncate">{dataset.name}</h1>
              {dashboardMetrics.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[10px] h-6 px-2"
                  onClick={() => setMetricsVisible(!metricsVisible)}
                  data-testid="button-toggle-metrics"
                >
                  {metricsVisible ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                  Metrics
                </Button>
              )}
            </div>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Export dashboard"
                    data-testid="button-export-menu"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportHTML} data-testid="export-html">
                    <Code className="w-4 h-4 mr-2" />
                    Export as HTML (hostable)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPNG} data-testid="export-png">
                    <Image className="w-4 h-4 mr-2" />
                    Export as PNG image
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF} data-testid="export-pdf">
                    <FileText className="w-4 h-4 mr-2" />
                    Export as PDF report
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleExportCSV} data-testid="export-csv">
                    <Download className="w-4 h-4 mr-2" />
                    Download data as CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleGenerateReport}
                title="Generate AI Report"
                data-testid="button-generate-report"
              >
                <Sparkles className="w-4 h-4" />
              </Button>
              <Button
                variant={chatOpen ? "default" : "ghost"}
                size="icon"
                onClick={() => setChatOpen(!chatOpen)}
                title="Toggle AI Chat"
                data-testid="button-toggle-chat"
              >
                {chatOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              </Button>
              <ThemeToggle />
            </div>
            </div>
          </header>

          <main className="flex-1 flex flex-col sm:flex-row overflow-hidden" ref={mainAreaRef}>
            <div
              className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden flex flex-col h-full"
              ref={dashboardRef}
            >
              <div className="w-full p-4 sm:p-5 lg:p-6">
                {dashLoading && initialMode === "auto" ? (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <Card key={i} className="p-4">
                        <Skeleton className="h-3 w-20 mb-2" />
                        <Skeleton className="h-6 w-16" />
                      </Card>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {[1, 2].map((i) => (
                      <Card key={i} className="p-4">
                        <Skeleton className="h-4 w-32 mb-4" />
                        <Skeleton className="h-52 w-full" />
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {showManualBuilder && (
                    <div className="mb-4 flex-shrink-0">
                      <ManualChartBuilder
                        columns={columns}
                        datasetId={datasetId}
                        onChartCreated={handleManualChartCreated}
                      />
                    </div>
                  )}

                  {metricsVisible && dashboardMetrics.length > 0 && (
                    <div className="mb-6 flex-shrink-0">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {dashboardMetrics.map((m, i) => (
                          <MetricCard key={i} metric={m} />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="w-full" ref={gridContainerRef}>
                    {dashboardCharts.length > 0 ? (
                      <ResponsiveGridLayout
                        key={`${selectedLayout}-${dashboardCharts.length}-${Math.round(gridWidth / 50)}`}
                        className="layout"
                        layouts={currentLayouts}
                        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                        rowHeight={100}
                        width={gridWidth}
                        onLayoutChange={handleLayoutChange}
                        draggableHandle=".drag-handle"
                        resizeHandles={["se", "sw", "ne", "nw", "e", "w", "n", "s"] as any}
                        margin={[16, 16] as [number, number]}
                        containerPadding={[0, 0] as [number, number]}
                        compactType="vertical"
                        isResizable={true}
                        isDraggable={true}
                        useCSSTransforms={true}
                      >
                        {dashboardCharts.map((chart, i) => (
                          <div key={String(i)} data-testid={`chart-grid-item-${i}`} style={{ overflow: "visible" }}>
                            <Card className="h-full flex flex-col overflow-visible relative group transition-shadow duration-200 hover:shadow-md">
                              <div className="drag-handle flex items-center gap-2 px-3 py-1.5 border-b cursor-grab active:cursor-grabbing bg-gradient-to-r from-pink-500/5 to-purple-500/5 dark:from-pink-500/10 dark:to-purple-500/10 flex-shrink-0">
                                <GripVertical className="w-3 h-3 text-muted-foreground" />
                                <span className="text-[11px] font-medium truncate flex-1">{chart.title}</span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                  onClick={() => handleRemoveChart(i)}
                                  data-testid={`button-remove-chart-${i}`}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                              <div className="flex-1 min-h-0 overflow-hidden p-1">
                                {chartStyle === "3d" ? (
                                  <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}>
                                    <EChartCard
                                      chart={chart}
                                      onSliceClick={handleSliceClick}
                                      showControls={true}
                                      noCard
                                      fillHeight
                                    />
                                  </Suspense>
                                ) : (
                                  <ChartCard
                                    chart={chart}
                                    onSliceClick={handleSliceClick}
                                    showControls={true}
                                    noCard
                                    fillHeight
                                  />
                                )}
                              </div>
                            </Card>
                          </div>
                        ))}
                      </ResponsiveGridLayout>
                    ) : initialMode === "manual" && !showManualBuilder ? (
                      <div className="flex items-center justify-center h-full">
                        <Card className="p-8 text-center max-w-sm">
                          <LayoutGrid className="w-8 h-8 text-primary mx-auto mb-3" />
                          <h3 className="font-medium mb-1">Manual Dashboard Mode</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Use the chart builder to create your own visualizations, or ask the AI to create them for you
                          </p>
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            <Button onClick={() => setShowManualBuilder(true)} data-testid="button-open-builder">
                              <Plus className="w-4 h-4 mr-1" />
                              Add Chart
                            </Button>
                            <Button variant="outline" onClick={() => setChatOpen(true)} data-testid="button-open-chat-manual">
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Ask AI
                            </Button>
                          </div>
                        </Card>
                      </div>
                    ) : !dashLoading && initialMode === "auto" && dashboardCharts.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <Card className="p-8 text-center">
                          <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
                          <h3 className="font-medium mb-1">Generating dashboard...</h3>
                          <p className="text-sm text-muted-foreground">
                            AI is analyzing your data and creating visualizations
                          </p>
                        </Card>
                      </div>
                    ) : null}
                  </div>

                  {suggestions.length > 0 && (
                    <div className="px-4 pb-2 flex-shrink-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Sparkles className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
                        {suggestions.slice(0, 3).map((s, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            className="text-[10px] h-6 px-2"
                            onClick={() => {
                              setChatOpen(true);
                              handleSendMessage(s);
                            }}
                            data-testid={`button-dashboard-suggestion-${i}`}
                          >
                            {s.length > 40 ? s.slice(0, 40) + "..." : s}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              </div>
            </div>

            <AnimatePresence>
              {chatOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 400, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  onAnimationComplete={() => {
                    if (gridContainerRef.current) {
                      setGridWidth(gridContainerRef.current.clientWidth);
                    }
                  }}
                  className="flex-shrink-0 h-full overflow-hidden hidden sm:flex border-l"
                >
                  <ChatPanel
                    datasetId={datasetId}
                    messages={chatMessages}
                    confidenceScores={confidenceScores}
                    onSendMessage={handleSendMessage}
                    onSliceClick={handleSliceClick}
                    onAddChartToDashboard={handleAddChartFromChat}
                    isLoading={isAiLoading}
                    suggestions={suggestions}
                    pinnedChart={pinnedChart}
                    onClearPinnedChart={() => setPinnedChart(null)}
                    chatOpen={chatOpen}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {chatOpen && (
              <div className="fixed inset-0 z-[90] sm:hidden">
                <div className="absolute inset-0 bg-black/50" onClick={() => setChatOpen(false)} />
                <div className="absolute inset-y-0 right-0 w-full max-w-[400px] bg-background shadow-2xl">
                  <ChatPanel
                    datasetId={datasetId}
                    messages={chatMessages}
                    confidenceScores={confidenceScores}
                    onSendMessage={handleSendMessage}
                    onSliceClick={handleSliceClick}
                    onAddChartToDashboard={handleAddChartFromChat}
                    isLoading={isAiLoading}
                    suggestions={suggestions}
                    pinnedChart={pinnedChart}
                    onClearPinnedChart={() => setPinnedChart(null)}
                    chatOpen={chatOpen}
                  />
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  AI Dashboard Report
                </DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  AI-generated analysis of your dashboard data and insights
                </DialogDescription>
              </div>
              {!reportLoading && reportContent && (
                <div className="flex items-center gap-1">
                  <Button
                    variant={reportPreview ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => setReportPreview(true)}
                    data-testid="button-report-preview"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant={!reportPreview ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => setReportPreview(false)}
                    data-testid="button-report-raw"
                  >
                    <Code className="w-3 h-3 mr-1" />
                    Raw
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {reportLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
                  <p className="text-sm text-muted-foreground">Generating comprehensive report...</p>
                </div>
              </div>
            ) : reportPreview ? (
              <div className="report-preview text-sm px-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportContent}</ReactMarkdown>
              </div>
            ) : (
              <div className="px-1">
                <pre className="whitespace-pre-wrap text-xs leading-relaxed bg-muted p-4 rounded-md overflow-x-auto">
                  {reportContent}
                </pre>
              </div>
            )}
          </div>
          {!reportLoading && reportContent && (
            <div className="flex items-center gap-2 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={handleCopyReport} data-testid="button-copy-report">
                <ClipboardCopy className="w-3.5 h-3.5 mr-1" />
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadReport} data-testid="button-download-report">
                <Download className="w-3.5 h-3.5 mr-1" />
                Download
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={columnDataOpen} onOpenChange={setColumnDataOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Table2 className="w-4 h-4 text-primary" />
              {showAllColumns ? "Data Table" : `Column: ${columnDataTitle}`}
              <Badge variant="secondary" className="text-[10px]">
                {columnData.length} rows (max 200)
              </Badge>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Preview of {showAllColumns ? "all columns" : columnDataTitle} data
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {columnDataLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : columnData.length > 0 ? (
              <table className="column-data-table w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left px-3 py-2 bg-muted font-medium text-xs border-b">#</th>
                    {Object.keys(columnData[0]).map((key) => (
                      <th key={key} className="text-left px-3 py-2 bg-muted font-medium text-xs border-b truncate max-w-[200px]">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {columnData.map((row, i) => (
                    <tr key={i} className="border-b border-border/50 hover-elevate">
                      <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-3 py-1.5 truncate max-w-[200px]">
                          {val === null || val === undefined ? (
                            <span className="text-muted-foreground italic">null</span>
                          ) : (
                            String(val)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">No data available</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
