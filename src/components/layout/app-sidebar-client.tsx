"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Sparkles, TrendingUp } from "lucide-react";
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
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { logOutAction } from "@/app/login/actions";

export function AppSidebarClient({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-2 p-4 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white p-1.5 shadow-sm group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-1">
            <Image
              src="/chemico_logo.png"
              alt="Chemico"
              width={32}
              height={32}
              className="size-full object-contain"
              priority
            />
          </span>
          <div className="flex min-w-0 flex-1 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-semibold text-lg tracking-tight text-sidebar-foreground">
              CMIS
            </span>
            <span className="text-[10px] font-medium text-sidebar-foreground/70 uppercase tracking-wider">
              Forecast
            </span>
          </div>
          <SidebarTrigger className="size-8 cursor-pointer text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden" />
        </div>
        <SidebarTrigger className="hidden size-8 cursor-pointer self-center text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:flex" />
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
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/scenarios")}
                >
                  <Link href="/scenarios" prefetch={false}>
                    <TrendingUp />
                    <span>Scenarios</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-0 p-2">
        {userEmail && (
          <div className="mx-1 mb-1 flex items-center gap-2 rounded-md px-2 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-1 group-data-[collapsible=icon]:justify-center">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sm font-semibold text-sidebar-accent-foreground"
              aria-hidden
              title={userEmail}
            >
              {userEmail.charAt(0).toUpperCase()}
            </span>
            <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
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
            tooltip="Log out"
            className="w-full cursor-pointer text-sidebar-foreground/80 hover:!bg-destructive/80 hover:!text-sidebar-foreground focus-visible:!bg-destructive/80 focus-visible:!text-sidebar-foreground"
          >
            <LogOut />
            <span>Log out</span>
          </SidebarMenuButton>
        </form>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
