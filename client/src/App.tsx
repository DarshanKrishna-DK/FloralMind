import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import UploadPage from "@/pages/upload";
import DashboardPage from "@/pages/dashboard";
import DashboardSetup from "@/pages/dashboard-setup";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/upload" component={UploadPage} />
      <Route path="/setup/:id" component={DashboardSetup} />
      <Route path="/dashboard/:id" component={DashboardPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
