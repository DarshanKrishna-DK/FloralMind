import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, ArrowRight, Sparkles, BarChart3, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import logoWithText from "@assets/ChatGPT_Image_Feb_15,_2026,_11_16_42_AM_1771134475217.png";

export default function UploadPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

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
        navigate(`/dashboard/${dataset.id}`);
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
      <header className="flex items-center justify-between gap-4 px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <img src={logoWithText} alt="FloralMind" className="h-8 object-contain" />
        </div>
        <div className="flex items-center gap-2" />
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
          className="w-full max-w-lg mb-10"
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
                  {progress < 30 ? "Uploading..." : progress < 70 ? "Analyzing schema..." : "Generating dashboard..."}
                </p>
              </div>
            )}

            <Button
              className="w-full mt-4"
              disabled={!file || uploading}
              onClick={handleUpload}
              data-testid="button-upload"
            >
              {uploading ? "Processing..." : "Analyze Dataset"}
              {!uploading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
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
