import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  SidebarProvider, SidebarTrigger, Sidebar, SidebarContent,
  SidebarGroup, SidebarGroupLabel, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  BarChart3, MessageSquare, Upload, Database, ArrowLeft,
  Table2, Sparkles, Columns3,
} from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { ChartCard } from "@/components/chart-card";
import { ChatPanel } from "@/components/chat-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Dataset, Message, ChartConfig, DashboardMetric, AIResponse } from "@shared/schema";
import { motion } from "framer-motion";
import logoIcon from "@assets/ChatGPT_Image_Feb_15,_2026,_11_17_44_AM_1771134475217.png";

type ViewMode = "dashboard" | "chat";

export default function DashboardPage() {
  const params = useParams<{ id: string }>();
  const datasetId = parseInt(params.id || "0");
  const [, navigate] = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [dashboardCharts, setDashboardCharts] = useState<ChartConfig[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetric[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const { data: dataset, isLoading: datasetLoading } = useQuery<Dataset>({
    queryKey: ["/api/datasets", datasetId],
  });

  const { data: initialDashboard, isLoading: dashLoading } = useQuery<{
    metrics: DashboardMetric[];
    charts: ChartConfig[];
    suggestions: string[];
  }>({
    queryKey: ["/api/datasets", datasetId, "dashboard"],
    enabled: !!dataset,
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
    } catch (err: any) {
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
    setViewMode("chat");
    await handleSendMessage(question);
  }, [handleSendMessage]);

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
          <Button onClick={() => navigate("/")} data-testid="button-go-home">
            <Upload className="w-4 h-4 mr-2" /> Upload New Dataset
          </Button>
        </Card>
      </div>
    );
  }

  const columns = dataset.columns as { name: string; type: string }[];

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
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setViewMode("dashboard")}
                      isActive={viewMode === "dashboard"}
                      data-testid="nav-dashboard"
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setViewMode("chat")}
                      isActive={viewMode === "chat"}
                      data-testid="nav-chat"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>AI Chat</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
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
                <div className="px-3 space-y-1">
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

            <div className="mt-auto p-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => navigate("/")}
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
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 overflow-hidden">
            {viewMode === "dashboard" ? (
              <div className="h-full overflow-y-auto p-4 space-y-4">
                {dashLoading ? (
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
                    {dashboardMetrics.length > 0 && (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {dashboardMetrics.map((m, i) => (
                          <MetricCard key={i} metric={m} />
                        ))}
                      </div>
                    )}

                    {dashboardCharts.length > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {dashboardCharts.map((chart, i) => (
                          <ChartCard
                            key={`${chart.title}-${i}`}
                            chart={chart}
                            onSliceClick={handleSliceClick}
                          />
                        ))}
                      </div>
                    ) : (
                      <Card className="p-8 text-center">
                        <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
                        <h3 className="font-medium mb-1">Generating dashboard...</h3>
                        <p className="text-sm text-muted-foreground">
                          AI is analyzing your data and creating visualizations
                        </p>
                      </Card>
                    )}

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
                                setViewMode("chat");
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
            ) : (
              <ChatPanel
                datasetId={datasetId}
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                onSliceClick={handleSliceClick}
                isLoading={isAiLoading}
                suggestions={suggestions}
              />
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
