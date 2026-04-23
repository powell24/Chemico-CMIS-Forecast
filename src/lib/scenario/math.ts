export type ScenarioInput = {
  accuracyLiftPct: number;
  carryingCostPct: number;
  horizonMonths: 12 | 24;
};

export type ScenarioBaselineBucket = {
  category: string;
  excessUnits: number;
  shortageUnits: number;
  anomalyCount: number;
  totalForecast: number;
};

export type ScenarioBreakdownRow = {
  category: string;
  workingCap: number;
  stockout: number;
  freight: number;
};

export type ScenarioOutcome = {
  workingCapitalFreed: number;
  stockoutRiskReduced: number;
  expeditedFreightAvoided: number;
  totalAnnualWin: number;
  breakdown: ScenarioBreakdownRow[];
};

const UNIT_PRICE = 14.5;
const STOCKOUT_PENALTY_PER_UNIT = 38;
const FREIGHT_PER_ANOMALY = 2400;
const BASELINE_MONTHS = 24;
const REDUCTION_PER_PP = 0.1;

export function computeScenario(
  input: ScenarioInput,
  baseline: ScenarioBaselineBucket[],
): ScenarioOutcome {
  const reduction = Math.max(
    0,
    Math.min(1, input.accuracyLiftPct * REDUCTION_PER_PP),
  );
  const carryRate = input.carryingCostPct / 100;
  const horizonFactor = input.horizonMonths / BASELINE_MONTHS;

  let totalWC = 0;
  let totalSO = 0;
  let totalFr = 0;
  const breakdown: ScenarioBreakdownRow[] = [];

  for (const b of baseline) {
    const wc =
      b.excessUnits * horizonFactor * UNIT_PRICE * carryRate * reduction;
    const so =
      b.shortageUnits * horizonFactor * STOCKOUT_PENALTY_PER_UNIT * reduction;
    const fr = b.anomalyCount * horizonFactor * FREIGHT_PER_ANOMALY * reduction;
    totalWC += wc;
    totalSO += so;
    totalFr += fr;
    breakdown.push({
      category: b.category,
      workingCap: wc,
      stockout: so,
      freight: fr,
    });
  }

  breakdown.sort(
    (a, b) =>
      b.workingCap + b.stockout + b.freight -
      (a.workingCap + a.stockout + a.freight),
  );

  return {
    workingCapitalFreed: totalWC,
    stockoutRiskReduced: totalSO,
    expeditedFreightAvoided: totalFr,
    totalAnnualWin: totalWC + totalSO + totalFr,
    breakdown,
  };
}

export const SCENARIO_DEFAULTS: ScenarioInput = {
  accuracyLiftPct: 5,
  carryingCostPct: 12,
  horizonMonths: 12,
};
