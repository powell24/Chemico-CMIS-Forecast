"use server";

import { getSiteDetail, type SiteDetail } from "@/lib/queries/sites";

export async function getSiteDetailAction(
  id: string,
): Promise<SiteDetail | null> {
  return getSiteDetail(id);
}
