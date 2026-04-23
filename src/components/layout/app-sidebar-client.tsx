"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Sparkles } from "lucide-react";
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
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/"}>
                  <Link href="/" prefetch={false}>
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/chat")}
                >
                  <Link href="/chat" prefetch={false}>
                    <Sparkles />
                    <span>Ask CMIS</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-0 p-2">
        {userEmail && (
          <div className="mx-1 mb-1 flex items-center gap-2 rounded-md px-2 py-2">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sm font-semibold text-sidebar-accent-foreground"
              aria-hidden
            >
              {userEmail.charAt(0).toUpperCase()}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-medium text-sidebar-foreground">
                Signed in
              </span>
              <span
                className="truncate text-[11px] text-sidebar-foreground/60"
                title={userEmail}
              >
                {userEmail}
              </span>
            </div>
          </div>
        )}
        <form action={logOutAction}>
          <SidebarMenuButton
            type="submit"
            className="w-full cursor-pointer text-sidebar-foreground/80 hover:!bg-destructive/80 hover:!text-sidebar-foreground focus-visible:!bg-destructive/80 focus-visible:!text-sidebar-foreground"
          >
            <LogOut />
            <span>Log out</span>
          </SidebarMenuButton>
        </form>
      </SidebarFooter>
    </Sidebar>
  );
}
