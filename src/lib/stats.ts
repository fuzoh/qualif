import type {
  GlobalStats,
  ObjectiveStats,
  ParticipantData,
  SphereId,
  SphereStats,
} from "./parser/types";

function meanAndVariance(values: number[]): { mean: number; variance: number } {
  if (values.length === 0) return { mean: 0, variance: 0 };
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.length > 1
      ? values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
      : 0;
  return {
    mean: Math.round(mean * 100) / 100,
    variance: Math.round(variance * 10000) / 10000,
  };
}

export function computeGlobalStats(
  participants: ParticipantData[],
): GlobalStats {
  const sphereIds: SphereId[] = ["A", "B", "C"];

  const spheres = {} as Record<SphereId, SphereStats | null>;
  const objectives = {} as Record<string, ObjectiveStats | null>;

  for (const sid of sphereIds) {
    const percentages = participants
      .map((p) => p.spheres.find((s) => s.id === sid)?.percentage)
      .filter((v): v is number => v !== null && v !== undefined);

    spheres[sid] = percentages.length > 0 ? meanAndVariance(percentages) : null;

    // Find max number of objectives for this sphere across participants
    const maxObj = Math.max(
      ...participants.map(
        (p) => p.spheres.find((s) => s.id === sid)?.objectives.length ?? 0,
      ),
    );

    for (let i = 0; i < maxObj; i++) {
      const key = `${sid}-${i}`;
      const objPercentages = participants
        .map((p) => p.spheres.find((s) => s.id === sid)?.objectives[i]?.percentage)
        .filter((v): v is number => v !== null && v !== undefined);

      objectives[key] =
        objPercentages.length > 0 ? meanAndVariance(objPercentages) : null;
    }
  }

  return { spheres, objectives };
}
