import { useState, useEffect, useCallback, useRef } from "react";
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
} from "@/components/ui/dialog";
import {
  BarChart3, MessageSquare, Upload, Database, Table2, Sparkles,
  Columns3, LayoutGrid, Grid2x2, Grid3x3, Rows3, Plus,
  Download, FileText, PanelRightOpen, PanelRightClose, Loader2, ClipboardCopy,
} from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { ChartCard } from "@/components/chart-card";
import { ChatPanel } from "@/components/chat-panel";
import { ManualChartBuilder } from "@/components/manual-chart-builder";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Dataset, Message, ChartConfig, DashboardMetric, AIResponse, ColumnInfo } from "@shared/schema";
import { motion } from "framer-motion";
import logoIcon from "@assets/ChatGPT_Image_Feb_15,_2026,_11_17_44_AM_1771134475217.png";

type LayoutMode = "1col" | "2col" | "3col";

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
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("2col");
  const [chatOpen, setChatOpen] = useState(false);
  const [showManualBuilder, setShowManualBuilder] = useState(initialMode === "manual");
  const [pinnedChart, setPinnedChart] = useState<ChartConfig | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportContent, setReportContent] = useState<string>("");
  const [reportLoading, setReportLoading] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

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
        setDashboardCharts((prev) => [data.chart!, ...prev]);
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
    setDashboardCharts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleManualChartCreated = useCallback((chart: ChartConfig) => {
    setDashboardCharts((prev) => [...prev, chart]);
  }, []);

  const handleGenerateReport = useCallback(async () => {
    setReportOpen(true);
    setReportLoading(true);
    setReportContent("");

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

  const handleExportDashboard = useCallback(async () => {
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

  const sidebarStyle = {
    "--sidebar-width": "13rem",
    "--sidebar-width-icon": "3rem",
  };

  const layoutGridClass = {
    "1col": "grid-cols-1",
    "2col": "grid-cols-1 lg:grid-cols-2",
    "3col": "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
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
              <div className="px-3 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <img src={logoIcon} alt="FloralMind" className="w-6 h-6" />
                  <span className="text-sm font-semibold">FloralMind</span>
                </div>
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
              <SidebarGroupLabel>Layout</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setLayoutMode("1col")}
                      isActive={layoutMode === "1col"}
                      data-testid="layout-1col"
                    >
                      <Rows3 className="w-4 h-4" />
                      <span>Single Column</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setLayoutMode("2col")}
                      isActive={layoutMode === "2col"}
                      data-testid="layout-2col"
                    >
                      <Grid2x2 className="w-4 h-4" />
                      <span>Two Columns</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setLayoutMode("3col")}
                      isActive={layoutMode === "3col"}
                      data-testid="layout-3col"
                    >
                      <Grid3x3 className="w-4 h-4" />
                      <span>Three Columns</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Columns</SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-3 space-y-1 max-h-40 overflow-y-auto">
                  {columns.map((col) => (
                    <div key={col.name} className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {col.type === "numeric" ? "num" : col.type === "date" ? "date" : "txt"}
                      </Badge>
                      <span className="text-xs truncate">{col.name}</span>
                    </div>
                  ))}
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
          <header className="flex items-center justify-between gap-2 px-4 py-2 border-b sticky top-0 z-50 bg-background">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-sm font-medium truncate">{dataset.name}</h1>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleExportCSV}
                title="Export data as CSV"
                data-testid="button-export-csv"
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleExportPDF}
                title="Export as PDF report"
                data-testid="button-export-pdf"
              >
                <FileText className="w-4 h-4" />
              </Button>
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
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {dashboardMetrics.map((m, i) => (
                        <MetricCard key={i} metric={m} />
                      ))}
                    </div>
                  )}

                  {dashboardCharts.length > 0 ? (
                    <div className={`grid ${layoutGridClass[layoutMode]} gap-3`}>
                      {dashboardCharts.map((chart, i) => (
                        <ChartCard
                          key={`${chart.title}-${i}`}
                          chart={chart}
                          onSliceClick={handleSliceClick}
                          onRemove={() => handleRemoveChart(i)}
                          showControls
                        />
                      ))}
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
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-primary" />
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
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Dashboard Report
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {reportLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
                  <p className="text-sm text-muted-foreground">Generating comprehensive report...</p>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none px-1">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{reportContent}</div>
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
    </SidebarProvider>
  );
}
