import { Link, useLocation } from "wouter";
import { useLogout } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarProvider
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { 
  Terminal, 
  LayoutDashboard, 
  Mic, 
  UserPlus, 
  Webhook, 
  MessageSquare, 
  Settings,
  LogOut
} from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        setLocation("/");
        toast({ title: "Logged out" });
      }
    });
  };

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/voice", label: "Voice Config", icon: Mic },
    { href: "/invites", label: "Invite Tracker", icon: UserPlus },
    { href: "/webhooks", label: "Webhooks", icon: Webhook },
    { href: "/embeds", label: "Embed Builder", icon: MessageSquare },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar className="border-r border-border bg-card">
        <SidebarHeader className="p-4 flex items-center gap-3">
          <Terminal className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg tracking-tight">Somali Bot</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive}>
                    <Link href={item.href} className="flex items-center gap-3 text-sm">
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </SidebarFooter>
      </Sidebar>
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="p-4 border-b border-border md:hidden">
          <SidebarTrigger />
        </div>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
