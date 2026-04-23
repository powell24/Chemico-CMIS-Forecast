import { Suspense } from "react";
import { ScenarioSection } from "@/components/scenarios/scenario-section";
import { ScenarioSkeleton } from "@/components/scenarios/scenario-skeleton";
import { SectionErrorBoundary } from "@/components/dashboard/section-error-boundary";

export default function ScenariosPage() {
  return (
    <SectionErrorBoundary label="the scenario planner">
      <Suspense fallback={<ScenarioSkeleton />}>
        <ScenarioSection />
      </Suspense>
    </SectionErrorBoundary>
  );
}
