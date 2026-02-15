import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, ArrowRight, ArrowLeft, Sparkles, BarChart3, MessageSquare, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import logoWithText from "@assets/ChatGPT_Image_Feb_15,_2026,_11_16_42_AM_1771134475217.png";

type DashboardMode = "auto" | "manual";

export default function UploadPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<DashboardMode>("auto");

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.name.endsWith(".csv")) {
      setFile(dropped);
    } else {
      toast({ title: "Invalid file", description: "Please upload a CSV file.", variant: "destructive" });
    }
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.name.endsWith(".csv")) {
      setFile(selected);
    } else {
      toast({ title: "Invalid file", description: "Please upload a CSV file.", variant: "destructive" });
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", file);

      setProgress(30);

      const res = await fetch("/api/datasets/upload", {
        method: "POST",
        body: formData,
      });

      setProgress(70);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const dataset = await res.json();
      setProgress(100);

      toast({ title: "Dataset uploaded", description: `${dataset.name} is ready for analysis.` });

      setTimeout(() => {
        navigate(`/dashboard/${dataset.id}?mode=${mode}`);
      }, 500);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      setUploading(false);
      setProgress(0);
    }
  };

  const features = [
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: "Auto-Generated Dashboards",
      description: "Intelligent charts created instantly from your data",
    },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      title: "Conversational Analytics",
      description: "Ask questions in plain English, get visual answers",
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "AI-Powered Insights",
      description: "Hypotheses and deeper analysis suggested automatically",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between gap-4 px-6 py-3 border-b sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            data-testid="button-back-landing"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <img src={logoWithText} alt="FloralMind" className="h-7 object-contain" />
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 max-w-2xl"
        >
          <h1 className="text-3xl font-semibold tracking-tight mb-3">
            Transform your data into
            <span className="text-primary"> thinking dashboards</span>
          </h1>
          <p className="text-muted-foreground text-base">
            Upload a CSV file and let AI generate interactive visualizations, uncover insights,
            and answer your questions conversationally.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-lg mb-6"
        >
          <Card className="p-6">
            <div
              data-testid="dropzone-upload"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-md p-10 text-center cursor-pointer
                transition-colors duration-200
                ${isDragging ? "border-primary bg-primary/5" : "border-border"}
                ${file ? "border-primary/50" : ""}
              `}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-file"
              />

              <AnimatePresence mode="wait">
                {file ? (
                  <motion.div
                    key="file-selected"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                      <FileSpreadsheet className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm" data-testid="text-filename">{file.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="no-file"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Drop your CSV file here
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        or click to browse
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {uploading && (
              <div className="mt-4">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {progress < 30 ? "Uploading..." : progress < 70 ? "Analyzing schema..." : "Preparing dashboard..."}
                </p>
              </div>
            )}
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="w-full max-w-lg mb-6"
        >
          <p className="text-xs text-muted-foreground mb-3 font-medium">Choose dashboard mode</p>
          <div className="grid grid-cols-2 gap-3">
            <Card
              className={`p-4 cursor-pointer transition-all hover-elevate ${
                mode === "auto" ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setMode("auto")}
              data-testid="mode-auto"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium">AI Generated</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AI analyzes your data and creates the best charts and metrics automatically
              </p>
            </Card>
            <Card
              className={`p-4 cursor-pointer transition-all hover-elevate ${
                mode === "manual" ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setMode("manual")}
              data-testid="mode-manual"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <Wrench className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium">Manual Build</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Choose your own columns, chart types, and metrics. AI chat still available
              </p>
            </Card>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-lg mb-10"
        >
          <Button
            className="w-full"
            disabled={!file || uploading}
            onClick={handleUpload}
            data-testid="button-upload"
          >
            {uploading ? "Processing..." : mode === "auto" ? "Generate AI Dashboard" : "Create Dashboard Manually"}
            {!uploading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full"
        >
          {features.map((feature, i) => (
            <Card key={i} className="p-4 text-center">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <div className="text-primary">{feature.icon}</div>
              </div>
              <h3 className="text-sm font-medium mb-1">{feature.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
