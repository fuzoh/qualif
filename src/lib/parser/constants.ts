import type { SphereId } from "./types";

export const SPHERE_SHEETS: { id: SphereId; sheetName: string }[] = [
  { id: "A", sheetName: "A - Techniques JS" },
  { id: "B", sheetName: "B - Organisation" },
  { id: "C", sheetName: "C - Scoutisme" },
];

export const SYNTHESE_SHEET = "Synthèse";

/** Row where objective/criteria/indicator data starts in sphere sheets */
export const DATA_START_ROW = 11;

/** Column letters for each data type */
export const COL = {
  OBJECTIVE_LABEL: "C",
  CRITERIA_LABEL: "D",
  INDICATOR_LABEL: "E",
  OBJECTIVE_WEIGHT: "F",
  CRITERIA_WEIGHT: "G",
  INDICATOR_SCORE: "H",
  COMMENT: "K",
} as const;

/** Synthèse sheet cell addresses */
export const SYNTHESE_CELLS = {
  TOTEM: "D3",
  PRENOM: "D4",
  NOM: "D5",
  COURS: "H3",
  DATE: "H5",
} as const;

/** Pass threshold: 80% */
export const PASS_THRESHOLD = 0.8;
