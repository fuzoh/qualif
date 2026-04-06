import type { Criterion, Indicator, Objective, Sphere } from "./types";
import { PASS_THRESHOLD } from "./constants";

/**
 * Mean of non-null indicator scores (0 and null are treated as "not observed").
 */
export function computeCriteriaAverage(indicators: Indicator[]): number | null {
  const scored = indicators.filter(
    (i): i is Indicator & { score: number } => i.score !== null && i.score > 0,
  );
  if (scored.length === 0) return null;
  return scored.reduce((sum, i) => sum + i.score, 0) / scored.length;
}

/**
 * Weighted average of criteria averages (weight from column G).
 */
export function computeObjectiveRawScore(
  criteria: Criterion[],
): number | null {
  let weightedSum = 0;
  let weightSum = 0;
  for (const c of criteria) {
    if (c.averageScore !== null) {
      weightedSum += c.averageScore * c.weight;
      weightSum += c.weight;
    }
  }
  return weightSum > 0 ? round2(weightedSum / weightSum) : null;
}

/**
 * Maps a 1-5 average score to a percentage scale.
 * Excel formula: n <= 3 ? (n-1)/2 : 1 + (n-3)*0.25
 * Result: 1→0, 2→0.5, 3→1.0, 4→1.25, 5→1.5
 */
export function mapScoreToPercentage(n: number): number {
  if (n <= 3) return round2((n - 1) / 2);
  return round2(1 + (n - 3) * 0.25);
}

/**
 * Weighted average of objective raw scores, then map to percentage.
 */
export function computeSphereScore(objectives: Objective[]): {
  rawScore: number | null;
  percentage: number | null;
  passed: boolean;
} {
  let weightedSum = 0;
  let weightSum = 0;
  for (const obj of objectives) {
    if (obj.rawScore !== null) {
      weightedSum += obj.rawScore * obj.weight;
      weightSum += obj.weight;
    }
  }
  if (weightSum === 0) {
    return { rawScore: null, percentage: null, passed: false };
  }
  const rawScore = round2(weightedSum / weightSum);
  const percentage = mapScoreToPercentage(rawScore);
  return { rawScore, percentage, passed: percentage >= PASS_THRESHOLD };
}

/**
 * Compute all derived scores on a fully-parsed Sphere (mutates in place).
 */
export function computeAllScores(sphere: Sphere): void {
  let totalFilled = 0;
  let totalIndicators = 0;

  for (const obj of sphere.objectives) {
    let objFilled = 0;
    let objTotal = 0;

    for (const crit of obj.criteria) {
      crit.averageScore = computeCriteriaAverage(crit.indicators);
      const filled = crit.indicators.filter(
        (i) => i.score !== null && i.score > 0,
      ).length;
      objFilled += filled;
      objTotal += crit.indicators.length;
    }

    obj.rawScore = computeObjectiveRawScore(obj.criteria);
    obj.percentage =
      obj.rawScore !== null ? mapScoreToPercentage(obj.rawScore) : null;
    obj.indicatorsFilled = objFilled;
    obj.indicatorsTotal = objTotal;
    obj.allFilledButNoComment =
      objFilled > 0 &&
      (obj.comment === null || obj.comment.trim() === "");

    totalFilled += objFilled;
    totalIndicators += objTotal;
  }

  const sphereResult = computeSphereScore(sphere.objectives);
  sphere.rawScore = sphereResult.rawScore;
  sphere.percentage = sphereResult.percentage;
  sphere.passed = sphereResult.passed;
  sphere.indicatorsFilled = totalFilled;
  sphere.indicatorsTotal = totalIndicators;
}

/**
 * Inverse of mapScoreToPercentage: percentage → raw score (1-5 scale).
 * pct <= 1.0 → n = pct*2 + 1
 * pct > 1.0 → n = (pct-1)/0.25 + 3
 */
export function mapPercentageToRawScore(pct: number): number {
  if (pct <= 1.0) return round2(pct * 2 + 1);
  return round2((pct - 1) / 0.25 + 3);
}

/**
 * For a sphere with empty objectives, compute the threshold percentage
 * for a given empty objective to bring/keep the sphere at exactly 80%.
 *
 * Other empty objectives are assumed to score at exactly 80% (threshold raw score).
 * This distributes the burden fairly across all empty objectives.
 *
 * Returns null if the objective already has a score or if 80% is unreachable.
 */
export function computeThresholdPercentage(
  sphere: Sphere,
  objectiveIndex: number,
): number | null {
  const target = sphere.objectives[objectiveIndex];
  if (target.rawScore !== null) return null;

  const thresholdRaw = mapPercentageToRawScore(PASS_THRESHOLD);

  // Sum contributions from all objectives:
  // - Known objectives: use their actual rawScore
  // - Other empty objectives: assume they score at threshold (80% → rawScore 2.6)
  // - Target objective: solve for its rawScore
  let knownWeightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < sphere.objectives.length; i++) {
    const o = sphere.objectives[i];
    totalWeight += o.weight;
    if (i === objectiveIndex) continue;

    if (o.rawScore !== null) {
      knownWeightedSum += o.rawScore * o.weight;
    } else {
      // Other empty objective: assume threshold score
      knownWeightedSum += thresholdRaw * o.weight;
    }
  }

  // Solve: (knownWeightedSum + targetRaw * targetWeight) / totalWeight = thresholdRaw
  const targetRaw =
    (thresholdRaw * totalWeight - knownWeightedSum) / target.weight;

  if (targetRaw > 5) return null; // impossible even with max score
  if (targetRaw < 1) return mapScoreToPercentage(1); // even score of 1 is enough
  return mapScoreToPercentage(round2(targetRaw));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
