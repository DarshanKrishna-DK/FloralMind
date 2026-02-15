import { Card } from "@/components/ui/card";
import type { DashboardMetric } from "@shared/schema";
import { TrendingUp, TrendingDown, Hash, DollarSign, Users, Package, BarChart3 } from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  dollar: <DollarSign className="w-4 h-4" />,
  users: <Users className="w-4 h-4" />,
  package: <Package className="w-4 h-4" />,
  chart: <BarChart3 className="w-4 h-4" />,
  hash: <Hash className="w-4 h-4" />,
};

export function MetricCard({ metric }: { metric: DashboardMetric }) {
  const icon = metric.icon ? iconMap[metric.icon] || <Hash className="w-4 h-4" /> : <Hash className="w-4 h-4" />;
  const isPositive = metric.change && !metric.change.startsWith("-");

  return (
    <Card className="p-4" data-testid={`card-metric-${metric.label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{metric.label}</p>
          <p className="text-xl font-semibold mt-1 truncate">{metric.value}</p>
        </div>
        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-primary">{icon}</span>
        </div>
      </div>
      {metric.change && (
        <div className="flex items-center gap-1 mt-2">
          {isPositive ? (
            <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-500 dark:text-red-400" />
          )}
          <span className={`text-xs ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
            {metric.change}
          </span>
        </div>
      )}
    </Card>
  );
}
