import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Voice from "@/pages/voice";
import Invites from "@/pages/invites";
import Webhooks from "@/pages/webhooks";
import Embeds from "@/pages/embeds";
import Settings from "@/pages/settings";

import { Layout } from "@/components/layout";
import { AuthGuard } from "@/components/auth-guard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2;
      },
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/dashboard">
        <AuthGuard><Layout><Dashboard /></Layout></AuthGuard>
      </Route>
      <Route path="/voice">
        <AuthGuard><Layout><Voice /></Layout></AuthGuard>
      </Route>
      <Route path="/invites">
        <AuthGuard><Layout><Invites /></Layout></AuthGuard>
      </Route>
      <Route path="/webhooks">
        <AuthGuard><Layout><Webhooks /></Layout></AuthGuard>
      </Route>
      <Route path="/embeds">
        <AuthGuard><Layout><Embeds /></Layout></AuthGuard>
      </Route>
      <Route path="/settings">
        <AuthGuard><Layout><Settings /></Layout></AuthGuard>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
