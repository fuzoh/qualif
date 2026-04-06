export interface Indicator {
  row: number;
  label: string;
  score: number | null; // 1-5, null = not observed
  comment: string | null;
}

export interface Criterion {
  row: number;
  label: string;
  weight: number; // 1 or 2
  indicators: Indicator[];
  averageScore: number | null;
}

export interface Objective {
  row: number;
  label: string;
  weight: number; // 1 or 2
  comment: string | null;
  criteria: Criterion[];
  rawScore: number | null; // weighted avg of criteria (1-5 scale)
  percentage: number | null; // mapped score (0-1.5 where 1.0 = 100%)
  indicatorsFilled: number;
  indicatorsTotal: number;
  allFilledButNoComment: boolean;
}

export type SphereId = "A" | "B" | "C";

export interface Sphere {
  id: SphereId;
  name: string;
  objectives: Objective[];
  rawScore: number | null;
  percentage: number | null;
  passed: boolean;
  indicatorsFilled: number;
  indicatorsTotal: number;
}

export interface ParticipantData {
  fileName: string;
  totem: string;
  prenom: string;
  nom: string;
  cours: string;
  date: string;
  spheres: [Sphere, Sphere, Sphere];
  objectiveCommentsFilled: number;
  objectiveCommentsTotal: number;
}

export interface SphereStats {
  mean: number;
  variance: number;
}

export interface ObjectiveStats {
  mean: number;
  variance: number;
}

export interface GlobalStats {
  spheres: Record<SphereId, SphereStats | null>;
  objectives: Record<string, ObjectiveStats | null>; // keyed by "A-0", "A-1", "B-0", etc.
}
