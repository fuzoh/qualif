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
      objTotal > 0 &&
      objFilled === objTotal &&
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
 * For a sphere, compute what percentage an empty objective would need
 * to bring the sphere to exactly the pass threshold (80%).
 * Returns null if the objective already has a score.
 */
export function computeNeededPercentage(
  sphere: Sphere,
  objectiveIndex: number,
): number | null {
  const obj = sphere.objectives[objectiveIndex];
  if (obj.rawScore !== null) return null;

  // Gather existing weighted sum and total weight (excluding the target objective)
  let existingWeightedSum = 0;
  let existingWeightSum = 0;
  for (let i = 0; i < sphere.objectives.length; i++) {
    if (i === objectiveIndex) continue;
    const o = sphere.objectives[i];
    if (o.rawScore !== null) {
      existingWeightedSum += o.rawScore * o.weight;
      existingWeightSum += o.weight;
    }
  }

  const targetWeight = obj.weight;
  const totalWeight = existingWeightSum + targetWeight;

  // We need: mapScoreToPercentage((existingWeightedSum + x * targetWeight) / totalWeight) = PASS_THRESHOLD
  // So: (existingWeightedSum + x * targetWeight) / totalWeight = mapPercentageToRawScore(PASS_THRESHOLD)
  const neededSphereRaw = mapPercentageToRawScore(PASS_THRESHOLD);
  const neededObjRaw = (neededSphereRaw * totalWeight - existingWeightedSum) / targetWeight;

  // Clamp to valid range and convert to percentage
  if (neededObjRaw < 1) return mapScoreToPercentage(1);
  if (neededObjRaw > 5) return null; // impossible even with max score
  return mapScoreToPercentage(round2(neededObjRaw));
}

/**
 * For a passing sphere, compute the worst percentage an empty objective
 * could get that would still keep the sphere passing.
 * Returns null if the objective already has a score.
 */
export function computeThresholdPercentage(
  sphere: Sphere,
  objectiveIndex: number,
): number | null {
  const obj = sphere.objectives[objectiveIndex];
  if (obj.rawScore !== null) return null;

  let existingWeightedSum = 0;
  let existingWeightSum = 0;
  for (let i = 0; i < sphere.objectives.length; i++) {
    if (i === objectiveIndex) continue;
    const o = sphere.objectives[i];
    if (o.rawScore !== null) {
      existingWeightedSum += o.rawScore * o.weight;
      existingWeightSum += o.weight;
    }
  }

  const targetWeight = obj.weight;
  const totalWeight = existingWeightSum + targetWeight;

  // What raw score would bring the sphere to exactly 80%?
  const thresholdRaw = mapPercentageToRawScore(PASS_THRESHOLD);
  const minObjRaw = (thresholdRaw * totalWeight - existingWeightedSum) / targetWeight;

  if (minObjRaw < 1) return mapScoreToPercentage(1);
  if (minObjRaw > 5) return null;
  return mapScoreToPercentage(round2(minObjRaw));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
