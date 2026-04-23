import { getScenarioBaseline } from "@/lib/queries/scenario-baseline";
import { ScenarioPlanner } from "./scenario-planner";

export async function ScenarioSection() {
  const baseline = await getScenarioBaseline();
  return (
    <ScenarioPlanner
      baseline={baseline.buckets}
      baselineAccuracy={baseline.baselineAccuracy}
    />
  );
}
