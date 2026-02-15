import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload, FileSpreadsheet, ArrowRight, ArrowLeft, Sparkles,
  BarChart3, MessageSquare, Wrench, Database, Table2,
  Loader2, CheckCircle2, AlertCircle, Link2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import logoWithText from "@assets/ChatGPT_Image_Feb_15,_2026,_11_16_42_AM_1771134475217.png";

type DashboardMode = "auto" | "manual";
type DataSource = "csv" | "supabase";

interface SupabaseTable {
  name: string;
  schema: string;
  rowCount: number | null;
}

export default function UploadPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<DashboardMode>("auto");
  const [dataSource, setDataSource] = useState<DataSource>("csv");

  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [tables, setTables] = useState<SupabaseTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

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

  const handleSupabaseConnect = async () => {
    if (!supabaseUrl || !supabaseKey) {
      toast({ title: "Missing fields", description: "Please enter both Supabase URL and API key.", variant: "destructive" });
      return;
    }

    setConnecting(true);
    setConnected(false);
    setTables([]);
    setSelectedTable(null);

    try {
      const res = await fetch("/api/supabase/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: supabaseUrl, key: supabaseKey }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Connection failed");
      }

      const data = await res.json();
      setTables(data.tables || []);
      setConnected(true);

      if (data.tables.length === 0) {
        toast({ title: "No tables found", description: "No accessible tables were found in this Supabase project.", variant: "destructive" });
      } else {
        toast({ title: "Connected", description: `Found ${data.tables.length} table${data.tables.length > 1 ? "s" : ""} in your Supabase project.` });
      }
    } catch (err: any) {
      toast({ title: "Connection failed", description: err.message, variant: "destructive" });
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  };

  const handleSupabaseImport = async () => {
    if (!selectedTable) return;

    setImporting(true);
    setImportProgress(10);

    try {
      setImportProgress(30);

      const res = await fetch("/api/supabase/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: supabaseUrl,
          key: supabaseKey,
          tableName: selectedTable,
        }),
      });

      setImportProgress(70);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Import failed");
      }

      const dataset = await res.json();
      setImportProgress(100);

      toast({ title: "Table imported", description: `"${selectedTable}" is ready for analysis.` });

      setTimeout(() => {
        navigate(`/dashboard/${dataset.id}?mode=${mode}`);
      }, 500);
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
      setImporting(false);
      setImportProgress(0);
    }
  };

  const resetSupabase = () => {
    setConnected(false);
    setTables([]);
    setSelectedTable(null);
    setSupabaseUrl("");
    setSupabaseKey("");
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

  const canProceedCSV = file && !uploading;
  const canProceedSupabase = selectedTable && !importing;

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
            Upload a CSV file or connect your Supabase database to generate interactive
            visualizations and AI-powered insights.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="w-full max-w-lg mb-6"
        >
          <p className="text-xs text-muted-foreground mb-3 font-medium">Choose data source</p>
          <div className="grid grid-cols-2 gap-3">
            <Card
              className={`p-4 cursor-pointer transition-all hover-elevate ${
                dataSource === "csv" ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => { setDataSource("csv"); }}
              data-testid="source-csv"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium">Upload CSV</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Upload a CSV file from your computer
              </p>
            </Card>
            <Card
              className={`p-4 cursor-pointer transition-all hover-elevate ${
                dataSource === "supabase" ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => { setDataSource("supabase"); }}
              data-testid="source-supabase"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-md bg-emerald-500/10 flex items-center justify-center">
                  <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-medium">Connect Supabase</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect your Supabase project and select tables
              </p>
            </Card>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {dataSource === "csv" ? (
            <motion.div
              key="csv-upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
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
          ) : (
            <motion.div
              key="supabase-connect"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-lg mb-6"
            >
              <Card className="p-6">
                {!connected ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
                        <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Connect to Supabase</p>
                        <p className="text-xs text-muted-foreground">Enter your project URL and API key</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="supabase-url" className="text-xs font-medium mb-1.5 block">Project URL</Label>
                        <div className="relative">
                          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="supabase-url"
                            placeholder="https://your-project.supabase.co"
                            value={supabaseUrl}
                            onChange={(e) => setSupabaseUrl(e.target.value)}
                            className="pl-9"
                            data-testid="input-supabase-url"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="supabase-key" className="text-xs font-medium mb-1.5 block">API Key (anon key recommended)</Label>
                        <Input
                          id="supabase-key"
                          type="password"
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          value={supabaseKey}
                          onChange={(e) => setSupabaseKey(e.target.value)}
                          data-testid="input-supabase-key"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          Find this in your Supabase dashboard under Settings &gt; API
                        </p>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleSupabaseConnect}
                      disabled={connecting || !supabaseUrl || !supabaseKey}
                      data-testid="button-supabase-connect"
                    >
                      {connecting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Database className="w-4 h-4 mr-2" />
                          Connect
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Connected</p>
                          <p className="text-xs text-muted-foreground">
                            {tables.length} table{tables.length !== 1 ? "s" : ""} found
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetSupabase}
                        data-testid="button-supabase-disconnect"
                      >
                        Disconnect
                      </Button>
                    </div>

                    {tables.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">Select a table to analyze</p>
                        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                          {tables.map((table) => (
                            <div
                              key={table.name}
                              className={`
                                flex items-center justify-between gap-3 px-3 py-2.5 rounded-md cursor-pointer
                                transition-colors border
                                ${selectedTable === table.name
                                  ? "border-primary bg-primary/5"
                                  : "border-transparent hover-elevate"
                                }
                              `}
                              onClick={() => setSelectedTable(table.name)}
                              data-testid={`table-row-${table.name}`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Table2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm font-medium truncate">{table.name}</span>
                              </div>
                              {table.rowCount !== null && (
                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                  {table.rowCount.toLocaleString()} rows
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-4 rounded-md bg-muted/50">
                        <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">
                          No accessible tables found. Check that your Supabase project has tables and the API key has proper permissions.
                        </p>
                      </div>
                    )}

                    {importing && (
                      <div className="mt-2">
                        <Progress value={importProgress} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          {importProgress < 30 ? "Connecting..." : importProgress < 70 ? "Fetching data..." : "Preparing dashboard..."}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

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
          {dataSource === "csv" ? (
            <Button
              className="w-full"
              disabled={!canProceedCSV}
              onClick={handleUpload}
              data-testid="button-upload"
            >
              {uploading ? "Processing..." : mode === "auto" ? "Generate AI Dashboard" : "Create Dashboard Manually"}
              {!uploading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          ) : (
            <Button
              className="w-full"
              disabled={!canProceedSupabase}
              onClick={handleSupabaseImport}
              data-testid="button-import-supabase"
            >
              {importing ? "Importing..." : mode === "auto" ? "Generate AI Dashboard" : "Create Dashboard Manually"}
              {!importing && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          )}
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
