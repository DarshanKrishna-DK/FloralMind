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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import type { ColumnInfo, ChartConfig } from "@shared/schema";

interface ManualChartBuilderProps {
  columns: ColumnInfo[];
  datasetId: number;
  onChartCreated: (chart: ChartConfig) => void;
}

export function ManualChartBuilder({ columns, datasetId, onChartCreated }: ManualChartBuilderProps) {
  const [chartType, setChartType] = useState<string>("bar");
  const [title, setTitle] = useState("");
  const [xColumn, setXColumn] = useState("");
  const [yColumn, setYColumn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericCols = columns.filter((c) => c.type === "numeric");
  const textCols = columns.filter((c) => c.type === "text" || c.type === "date");
  const allCols = columns;

  const handleCreate = async () => {
    if (!xColumn || !yColumn) {
      setError("Please select both X and Y columns");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sanitize = (name: string) => name.trim().replace(/[^a-zA-Z0-9_]/g, "_").replace(/^(\d)/, "_$1").toLowerCase();
      const xSafe = sanitize(xColumn);
      const ySafe = sanitize(yColumn);

      let sql: string;
      if (chartType === "pie") {
        sql = `SELECT "${xSafe}", SUM(CAST("${ySafe}" AS REAL)) as "${ySafe}" FROM data GROUP BY "${xSafe}" ORDER BY "${ySafe}" DESC LIMIT 10`;
      } else {
        sql = `SELECT "${xSafe}", "${ySafe}" FROM data LIMIT 50`;
        if (textCols.some((c) => sanitize(c.name) === xSafe)) {
          sql = `SELECT "${xSafe}", SUM(CAST("${ySafe}" AS REAL)) as "${ySafe}" FROM data GROUP BY "${xSafe}" ORDER BY "${ySafe}" DESC LIMIT 15`;
        }
      }

      const res = await fetch(`/api/datasets/${datasetId}/sql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Query failed");
      }

      const result = await res.json();

      const chart: ChartConfig = {
        type: chartType as ChartConfig["type"],
        title: title || `${yColumn} by ${xColumn}`,
        data: result.rows,
        xKey: xSafe,
        yKeys: [ySafe],
      };

      onChartCreated(chart);
      setTitle("");
      setXColumn("");
      setYColumn("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium mb-3">Add New Chart</h3>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Chart Title (optional)</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sales by Region"
            className="mt-1"
            data-testid="input-chart-title"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Chart Type</Label>
            <Select value={chartType} onValueChange={setChartType}>
              <SelectTrigger className="mt-1" data-testid="select-new-chart-type">
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
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">X-Axis (Category)</Label>
            <Select value={xColumn} onValueChange={setXColumn}>
              <SelectTrigger className="mt-1" data-testid="select-x-column">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {allCols.map((col) => (
                  <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Y-Axis (Value)</Label>
            <Select value={yColumn} onValueChange={setYColumn}>
              <SelectTrigger className="mt-1" data-testid="select-y-column">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {allCols.map((col) => (
                  <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        <Button
          onClick={handleCreate}
          disabled={loading || !xColumn || !yColumn}
          className="w-full"
          data-testid="button-create-chart"
        >
          {loading ? "Creating..." : "Add Chart"}
          {!loading && <Plus className="w-4 h-4 ml-1" />}
        </Button>
      </div>
    </Card>
  );
}
