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
  GripVertical, Image, Code, Share2, X,
} from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { ChartCard } from "@/components/chart-card";
import { ChatPanel } from "@/components/chat-panel";
import { ManualChartBuilder } from "@/components/manual-chart-builder";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Dataset, Message, ChartConfig, DashboardMetric, AIResponse, ColumnInfo } from "@shared/schema";
import { motion } from "framer-motion";
import { ResponsiveGridLayout as RGLBase } from "react-grid-layout";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import logoIcon from "@assets/ChatGPT_Image_Feb_15,_2026,_11_17_44_AM_1771145176190.png";

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

function generateLayout(count: number, cols: number = 2): GridLayout[] {
  return Array.from({ length: count }, (_, i) => ({
    i: String(i),
    x: (i % cols) * (12 / cols),
    y: Math.floor(i / cols) * 4,
    w: 12 / cols,
    h: 4,
    minW: 3,
    minH: 2,
  }));
}

export default function DashboardPage() {
  const params = useParams<{ id: string }>();
  const datasetId = parseInt(params.id || "0");
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const initialMode = searchParams.get("mode") || "auto";

  const [chatMessages, setChatMessages] = useState<Message[]>([]);
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
  const dashboardRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const { data: dataset, isLoading: datasetLoading } = useQuery<Dataset>({
    queryKey: ["/api/datasets", datasetId],
  });

  const { data: initialDashboard, isLoading: dashLoading } = useQuery<{
    metrics: DashboardMetric[];
    charts: ChartConfig[];
    suggestions: string[];
  }>({
    queryKey: ["/api/datasets", datasetId, "dashboard"],
    enabled: !!dataset && initialMode === "auto",
  });

  useEffect(() => {
    if (initialDashboard) {
      setDashboardMetrics(initialDashboard.metrics || []);
      setDashboardCharts(initialDashboard.charts || []);
      setSuggestions(initialDashboard.suggestions || []);
    }
  }, [initialDashboard]);

  useEffect(() => {
    if (dashboardCharts.length > 0 && Object.keys(gridLayouts).length === 0) {
      const layout = generateLayout(dashboardCharts.length, 2);
      setGridLayouts({ lg: layout, md: layout, sm: generateLayout(dashboardCharts.length, 1) });
    }
  }, [dashboardCharts.length, gridLayouts]);

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

  const handleLayoutChange = useCallback((_layout: any, allLayouts: any) => {
    setGridLayouts(allLayouts);
  }, []);

  const addChartToGrid = useCallback((chart: ChartConfig) => {
    setDashboardCharts((prev) => {
      const newCharts = [...prev, chart];
      const newIndex = newCharts.length - 1;
      const newItem: GridLayout = {
        i: String(newIndex),
        x: 0,
        y: Infinity,
        w: 6,
        h: 4,
        minW: 3,
        minH: 2,
      };
      setGridLayouts((prevLayouts) => {
        const lgLayout = [...(prevLayouts.lg || []), newItem];
        const smLayout = [...(prevLayouts.sm || []), { ...newItem, w: 12, x: 0 }];
        return { ...prevLayouts, lg: lgLayout, md: lgLayout, sm: smLayout };
      });
      return newCharts;
    });
  }, []);

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

      const assistantMessage: Message = {
        id: Date.now() + 1,
        conversationId: 0,
        role: "assistant",
        content: data.message,
        chartData: data.chart || null,
        suggestions: data.suggestions || null,
        createdAt: new Date(),
      };
      setChatMessages((prev) => [...prev, assistantMessage]);

      if (data.chart) {
        addChartToGrid(data.chart);
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
  }, [datasetId, addChartToGrid]);

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
      setGridLayouts((prevLayouts) => {
        const updated: { [key: string]: GridLayout[] } = {};
        for (const [breakpoint, layouts] of Object.entries(prevLayouts)) {
          updated[breakpoint] = layouts
            .filter((l) => l.i !== String(index))
            .map((l) => {
              const oldIdx = parseInt(l.i);
              if (oldIdx > index) {
                return { ...l, i: String(oldIdx - 1) };
              }
              return l;
            });
        }
        return updated;
      });
      return newCharts;
    });
  }, []);

  const handleManualChartCreated = useCallback((chart: ChartConfig) => {
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
      if (dashboardRef.current) {
        const canvas = await html2canvas(dashboardRef.current, {
          backgroundColor: null,
          scale: 2,
          useCORS: true,
        });
        const link = document.createElement("a");
        link.download = `${dataset?.name || "dashboard"}-export.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }
    } catch (err) {
      console.error("Export failed:", err);
    }
  }, [dataset]);

  const handleExportPDF = useCallback(async () => {
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      if (dashboardRef.current) {
        const canvas = await html2canvas(dashboardRef.current, {
          backgroundColor: "#ffffff",
          scale: 2,
          useCORS: true,
        });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("l", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${dataset?.name || "dashboard"}-report.pdf`);
      }
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
      if (!dashboardRef.current) return;

      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });
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
    const layout = generateLayout(dashboardCharts.length, 2);
    return { lg: layout, md: layout, sm: generateLayout(dashboardCharts.length, 1) };
  }, [gridLayouts, dashboardCharts.length]);

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
                <div className="px-1 space-y-0.5 max-h-48 overflow-y-auto">
                  {columns.map((col) => (
                    <SidebarMenu key={col.name}>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleColumnClick(col.name)}
                          data-testid={`column-${col.name}`}
                          className="py-1"
                        >
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                            {col.type === "numeric" ? "num" : col.type === "date" ? "date" : "txt"}
                          </Badge>
                          <span className="text-xs truncate">{col.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  ))}
                  <div className="px-2 pt-1">
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
          <header className="sticky top-0 z-50 bg-background border-b">
            <div className="h-[2px] w-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />
            <div className="flex items-center justify-between gap-2 px-4 py-2">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-sm font-semibold truncate">{dataset.name}</h1>
              <Badge variant="secondary" className="text-[10px] bg-gradient-to-r from-pink-500/10 to-purple-500/10 dark:from-pink-500/20 dark:to-purple-500/20">
                <GripVertical className="w-2.5 h-2.5 mr-0.5" />
                Drag to rearrange
              </Badge>
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

          <main className="flex-1 overflow-hidden flex">
            <div className={`flex-1 min-w-0 overflow-y-auto p-4 space-y-4 ${chatOpen ? "max-w-[calc(100%-380px)]" : ""}`} ref={dashboardRef}>
              {dashLoading && initialMode === "auto" ? (
                <>
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
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {showManualBuilder && (
                    <ManualChartBuilder
                      columns={columns}
                      datasetId={datasetId}
                      onChartCreated={handleManualChartCreated}
                    />
                  )}

                  {dashboardMetrics.length > 0 && (
                    <div className="p-3 rounded-md bg-gradient-to-r from-pink-500/5 via-transparent to-purple-500/5 dark:from-pink-500/10 dark:to-purple-500/10">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {dashboardMetrics.map((m, i) => (
                          <MetricCard key={i} metric={m} />
                        ))}
                      </div>
                    </div>
                  )}

                  {dashboardCharts.length > 0 ? (
                    <div ref={gridContainerRef}>
                    <ResponsiveGridLayout
                      className="layout"
                      layouts={currentLayouts}
                      breakpoints={{ lg: 1200, md: 800, sm: 480 }}
                      cols={{ lg: 12, md: 12, sm: 12 }}
                      rowHeight={80}
                      width={gridWidth}
                      onLayoutChange={handleLayoutChange}
                      draggableHandle=".drag-handle"
                      resizeHandles={["se"] as any}
                      margin={[12, 12] as [number, number]}
                      containerPadding={[0, 0] as [number, number]}
                    >
                      {dashboardCharts.map((chart, i) => (
                        <div key={String(i)} data-testid={`chart-grid-item-${i}`} style={{ overflow: "visible" }}>
                          <Card className="h-full flex flex-col overflow-visible relative group transition-shadow duration-200 hover:shadow-md">
                            <div className="drag-handle flex items-center gap-2 px-3 py-2 border-b cursor-grab active:cursor-grabbing bg-gradient-to-r from-pink-500/5 to-purple-500/5 dark:from-pink-500/10 dark:to-purple-500/10">
                              <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs font-medium truncate flex-1">{chart.title}</span>
                            </div>
                            <div className="flex-1 min-h-0 overflow-hidden">
                              <ChartCard
                                chart={chart}
                                onSliceClick={handleSliceClick}
                                onRemove={() => handleRemoveChart(i)}
                                showControls
                                noCard
                              />
                            </div>
                          </Card>
                        </div>
                      ))}
                    </ResponsiveGridLayout>
                    </div>
                  ) : initialMode === "manual" && !showManualBuilder ? (
                    <Card className="p-8 text-center">
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
                  ) : !dashLoading && initialMode === "auto" ? (
                    <Card className="p-8 text-center">
                      <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
                      <h3 className="font-medium mb-1">Generating dashboard...</h3>
                      <p className="text-sm text-muted-foreground">
                        AI is analyzing your data and creating visualizations
                      </p>
                    </Card>
                  ) : null}

                  {suggestions.length > 0 && (
                    <Card className="p-4 bg-gradient-to-r from-pink-500/5 via-transparent to-purple-500/5 dark:from-pink-500/10 dark:to-purple-500/10">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-pink-500" />
                        <h3 className="text-sm font-medium">Suggested analyses</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((s, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setChatOpen(true);
                              handleSendMessage(s);
                            }}
                            data-testid={`button-dashboard-suggestion-${i}`}
                          >
                            {s}
                          </Button>
                        ))}
                      </div>
                    </Card>
                  )}
                </motion.div>
              )}
            </div>

            {chatOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 380, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-l flex-shrink-0 h-full"
                style={{ width: 380 }}
              >
                <ChatPanel
                  datasetId={datasetId}
                  messages={chatMessages}
                  onSendMessage={handleSendMessage}
                  onSliceClick={handleSliceClick}
                  isLoading={isAiLoading}
                  suggestions={suggestions}
                  pinnedChart={pinnedChart}
                  onClearPinnedChart={() => setPinnedChart(null)}
                />
              </motion.div>
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
