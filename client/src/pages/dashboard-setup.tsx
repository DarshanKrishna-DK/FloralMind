import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Sparkles, BarChart3, LayoutGrid, Grid3X3,
  Rows3, SquareSplitHorizontal, Minus, Plus, ArrowRight, Wrench,
  Database, Hash,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion } from "framer-motion";
import type { Dataset } from "@shared/schema";
import logoWithText from "@assets/ChatGPT_Image_Feb_15,_2026,_03_59_07_PM_1771151367873.png";

interface DashboardConfig {
  chartCount: number;
  layoutStyle: "executive" | "analytical" | "detailed" | "wide";
  chartDensity: "minimal" | "balanced" | "heavy";
  chartStyle: "2d" | "3d" | "flat";
}

const chartCountOptions = [
  { value: 4, label: "4 Charts" },
  { value: 6, label: "6 Charts" },
  { value: 8, label: "8 Charts" },
];

const layoutOptions = [
  {
    value: "executive" as const,
    label: "Executive",
    description: "2 large KPI-focused + medium charts",
    icon: SquareSplitHorizontal,
  },
  {
    value: "analytical" as const,
    label: "Analytical",
    description: "Balanced grid layout",
    icon: LayoutGrid,
  },
  {
    value: "detailed" as const,
    label: "Detailed",
    description: "Multi-row compact grid",
    icon: Grid3X3,
  },
  {
    value: "wide" as const,
    label: "Wide Focus",
    description: "1 large hero chart + supporting",
    icon: Rows3,
  },
];

const densityOptions = [
  { value: "minimal" as const, label: "Minimal", description: "Clean, less data points" },
  { value: "balanced" as const, label: "Balanced", description: "Standard detail level" },
  { value: "heavy" as const, label: "Data-heavy", description: "More detail and data points" },
];

const styleOptions = [
  { value: "2d" as const, label: "2D Professional", description: "Standard chart types" },
  { value: "3d" as const, label: "Subtle 3D", description: "Depth & gradient effects" },
  { value: "flat" as const, label: "Flat Minimal", description: "Simpler visualizations" },
];

export default function DashboardSetup() {
  const params = useParams<{ id: string }>();
  const datasetId = params.id || "0";
  const [, navigate] = useLocation();

  const [chartCount, setChartCount] = useState(4);
  const [customCount, setCustomCount] = useState("");
  const [useCustomCount, setUseCustomCount] = useState(false);
  const [layoutStyle, setLayoutStyle] = useState<DashboardConfig["layoutStyle"]>("analytical");
  const [chartDensity, setChartDensity] = useState<DashboardConfig["chartDensity"]>("balanced");
  const [chartStyle, setChartStyle] = useState<DashboardConfig["chartStyle"]>("2d") as [DashboardConfig["chartStyle"], React.Dispatch<React.SetStateAction<DashboardConfig["chartStyle"]>>];

  const { data: dataset, isLoading: datasetLoading } = useQuery<Dataset>({
    queryKey: ["/api/datasets", parseInt(datasetId)],
  });

  const effectiveChartCount = useCustomCount
    ? Math.max(1, Math.min(12, parseInt(customCount) || 4))
    : chartCount;

  const handleGenerate = () => {
    const config: DashboardConfig = {
      chartCount: effectiveChartCount,
      layoutStyle,
      chartDensity,
      chartStyle,
    };
    const encoded = btoa(JSON.stringify(config));
    navigate(`/dashboard/${datasetId}?mode=auto&config=${encoded}`);
  };

  const handleSkipToManual = () => {
    navigate(`/dashboard/${datasetId}?mode=manual`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between gap-4 px-6 py-3 border-b sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/upload")}
            data-testid="button-back-upload"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <img src={logoWithText} alt="FloralMind" className="h-7 object-contain" />
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-8 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">Dashboard Blueprint</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight mb-2">
              Configure Your Dashboard
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Customize how AI generates your dashboard before we begin analysis.
            </p>
          </div>

          {datasetLoading ? (
            <Card className="p-4 mb-6">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-md" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-40 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </Card>
          ) : dataset ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card className="p-4 mb-6" data-testid="card-dataset-info">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Database className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" data-testid="text-dataset-name">{dataset.name}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-muted-foreground" data-testid="text-dataset-rows">
                        {dataset.rowCount.toLocaleString()} rows
                      </span>
                      <span className="text-xs text-muted-foreground" data-testid="text-dataset-cols">
                        {(dataset.columns as any[])?.length || 0} columns
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ) : null}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="space-y-6"
          >
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-3 block">Number of Charts</label>
              <div className="grid grid-cols-4 gap-2">
                {chartCountOptions.map((opt) => (
                  <Card
                    key={opt.value}
                    className={`p-3 cursor-pointer transition-all text-center hover-elevate ${
                      !useCustomCount && chartCount === opt.value ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => { setChartCount(opt.value); setUseCustomCount(false); }}
                    data-testid={`option-chart-count-${opt.value}`}
                  >
                    <span className="text-sm font-medium">{opt.label}</span>
                  </Card>
                ))}
                <Card
                  className={`p-3 cursor-pointer transition-all text-center hover-elevate ${
                    useCustomCount ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setUseCustomCount(true)}
                  data-testid="option-chart-count-custom"
                >
                  <span className="text-sm font-medium">Custom</span>
                </Card>
              </div>
              {useCustomCount && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.2 }}
                  className="mt-3 flex items-center gap-2"
                >
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCustomCount(String(Math.max(1, (parseInt(customCount) || 4) - 1)))}
                    data-testid="button-custom-count-decrease"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={customCount}
                    onChange={(e) => setCustomCount(e.target.value)}
                    placeholder="4"
                    className="w-20 text-center"
                    data-testid="input-custom-chart-count"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCustomCount(String(Math.min(12, (parseInt(customCount) || 4) + 1)))}
                    data-testid="button-custom-count-increase"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  <span className="text-xs text-muted-foreground">1-12 charts</span>
                </motion.div>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-3 block">Layout Style</label>
              <div className="grid grid-cols-2 gap-2">
                {layoutOptions.map((opt) => (
                  <Card
                    key={opt.value}
                    className={`p-4 cursor-pointer transition-all hover-elevate ${
                      layoutStyle === opt.value ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setLayoutStyle(opt.value)}
                    data-testid={`option-layout-${opt.value}`}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <opt.icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{opt.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{opt.description}</p>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-3 block">Chart Density</label>
              <div className="grid grid-cols-3 gap-2">
                {densityOptions.map((opt) => (
                  <Card
                    key={opt.value}
                    className={`p-3 cursor-pointer transition-all hover-elevate ${
                      chartDensity === opt.value ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setChartDensity(opt.value)}
                    data-testid={`option-density-${opt.value}`}
                  >
                    <span className="text-sm font-medium block mb-0.5">{opt.label}</span>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{opt.description}</p>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-3 block">Chart Style</label>
              <div className="grid grid-cols-3 gap-2">
                {styleOptions.map((opt) => (
                  <Card
                    key={opt.value}
                    className={`p-3 cursor-pointer transition-all hover-elevate ${
                      chartStyle === opt.value ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setChartStyle(opt.value)}
                    data-testid={`option-style-${opt.value}`}
                  >
                    <span className="text-sm font-medium block mb-0.5">{opt.label}</span>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{opt.description}</p>
                  </Card>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            className="mt-8 space-y-3"
          >
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <Badge variant="secondary" className="text-[10px]" data-testid="badge-chart-count">
                  <Hash className="w-3 h-3 mr-1" />
                  {effectiveChartCount} charts
                </Badge>
                <Badge variant="secondary" className="text-[10px]" data-testid="badge-layout">
                  {layoutStyle}
                </Badge>
                <Badge variant="secondary" className="text-[10px]" data-testid="badge-density">
                  {chartDensity}
                </Badge>
                <Badge variant="secondary" className="text-[10px]" data-testid="badge-style">
                  {chartStyle === "2d" ? "2D Professional" : chartStyle === "3d" ? "Subtle 3D" : "Flat Minimal"}
                </Badge>
              </div>
              <Button
                className="w-full"
                onClick={handleGenerate}
                data-testid="button-generate-dashboard"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>

            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkipToManual}
                className="text-xs text-muted-foreground"
                data-testid="button-skip-to-manual"
              >
                <Wrench className="w-3 h-3 mr-1" />
                Skip to Manual Mode
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
