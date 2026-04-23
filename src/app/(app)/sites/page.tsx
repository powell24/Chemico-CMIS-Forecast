import { getSiteSummaries } from "@/lib/queries/sites";
import { getFilterOptions } from "@/lib/queries/filter-options";
import { SiteWorkspace } from "@/components/sites/site-workspace";
import { SectionErrorBoundary } from "@/components/dashboard/section-error-boundary";

export default async function SitesPage() {
  const [summaries, filterOptions] = await Promise.all([
    getSiteSummaries(),
    getFilterOptions(),
  ]);
  return (
    <SectionErrorBoundary label="the site network">
      <SiteWorkspace
        summaries={summaries}
        customers={filterOptions.customers}
      />
    </SectionErrorBoundary>
  );
}
