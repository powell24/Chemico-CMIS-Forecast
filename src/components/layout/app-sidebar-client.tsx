"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { logOutAction } from "@/app/login/actions";

export function AppSidebarClient({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();

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
                <SidebarMenuButton asChild isActive={pathname === "/"}>
                  <Link href="/" prefetch={false}>
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
          {userEmail && (
            <span
              className="text-xs text-sidebar-foreground/70 truncate"
              title={userEmail}
            >
              {userEmail}
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
