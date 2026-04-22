import Link from "next/link";
import { LayoutDashboard, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/server";
import { logOutAction } from "@/app/login/actions";

export async function AppSidebar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg tracking-tight text-sidebar-foreground">
            CMIS
          </span>
          <span className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wider">
            Forecast
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/">
                    <LayoutDashboard />
                    <span>Forecast</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex flex-col gap-2">
          {user?.email && (
            <span
              className="text-xs text-sidebar-foreground/70 truncate"
              title={user.email}
            >
              {user.email}
            </span>
          )}
          <form action={logOutAction}>
            <SidebarMenuButton type="submit" className="w-full">
              <LogOut />
              <span>Log out</span>
            </SidebarMenuButton>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
