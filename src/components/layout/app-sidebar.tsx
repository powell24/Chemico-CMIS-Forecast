import { createClient } from "@/lib/supabase/server";
import { AppSidebarClient } from "./app-sidebar-client";

export async function AppSidebar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <AppSidebarClient userEmail={user?.email ?? null} />;
}
