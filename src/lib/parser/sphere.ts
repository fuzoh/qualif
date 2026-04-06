import type * as XLSX from "xlsx";
import type { Criterion, Indicator, Objective, Sphere, SphereId } from "./types";
import { COL, DATA_START_ROW } from "./constants";
import { computeAllScores } from "./scoring";

function cellValue(
  sheet: XLSX.WorkSheet,
  col: string,
  row: number,
): string | number | null {
  const cell = sheet[`${col}${row}`];
  if (!cell) return null;
  const v = cell.v;
  if (v === undefined || v === null || v === "") return null;
  return v as string | number;
}

function cellString(
  sheet: XLSX.WorkSheet,
  col: string,
  row: number,
): string | null {
  const v = cellValue(sheet, col, row);
  if (v === null) return null;
  return String(v).trim() || null;
}

function cellNumber(
  sheet: XLSX.WorkSheet,
  col: string,
  row: number,
): number | null {
  const v = cellValue(sheet, col, row);
  if (v === null || v === 0) return null; // 0 = not observed
  if (typeof v === "number") return v;
  const n = Number(v);
  return isNaN(n) || n === 0 ? null : n;
}

/**
 * Parse a sphere sheet into its Objective > Criterion > Indicator hierarchy.
 * Detects level by which column contains text:
 *   C = Objective, D = Criterion, E = Indicator
 */
export function parseSphere(
  sheet: XLSX.WorkSheet,
  id: SphereId,
  sheetName: string,
): Sphere {
  const range = sheet["!ref"];
  const maxRow = range ? parseInt(range.split(":")[1].replace(/[A-Z]/g, "")) : 500;

  const objectives: Objective[] = [];
  let currentObjective: Objective | null = null;
  let currentCriterion: Criterion | null = null;

  for (let row = DATA_START_ROW; row <= maxRow; row++) {
    const objLabel = cellString(sheet, COL.OBJECTIVE_LABEL, row);
    const critLabel = cellString(sheet, COL.CRITERIA_LABEL, row);
    const indLabel = cellString(sheet, COL.INDICATOR_LABEL, row);

    if (objLabel) {
      // Finalize previous criterion and objective
      if (currentCriterion && currentObjective) {
        currentObjective.criteria.push(currentCriterion);
      }
      if (currentObjective) {
        objectives.push(currentObjective);
      }

      currentObjective = {
        row,
        label: objLabel,
        weight: (cellNumber(sheet, COL.OBJECTIVE_WEIGHT, row) ?? 1),
        comment: cellString(sheet, COL.COMMENT, row),
        criteria: [],
        rawScore: null,
        percentage: null,
        indicatorsFilled: 0,
        indicatorsTotal: 0,
        allFilledButNoComment: false,
      };
      currentCriterion = null;
    } else if (critLabel) {
      // Finalize previous criterion
      if (currentCriterion && currentObjective) {
        currentObjective.criteria.push(currentCriterion);
      }

      currentCriterion = {
        row,
        label: critLabel,
        weight: (cellNumber(sheet, COL.CRITERIA_WEIGHT, row) ?? 1),
        indicators: [],
        averageScore: null,
      };
    } else if (indLabel) {
      if (!currentCriterion) continue;

      const indicator: Indicator = {
        row,
        label: indLabel,
        score: cellNumber(sheet, COL.INDICATOR_SCORE, row),
        comment: cellString(sheet, COL.COMMENT, row),
      };
      currentCriterion.indicators.push(indicator);
    }
  }

  // Finalize last criterion and objective
  if (currentCriterion && currentObjective) {
    currentObjective.criteria.push(currentCriterion);
  }
  if (currentObjective) {
    objectives.push(currentObjective);
  }

  const sphere: Sphere = {
    id,
    name: sheetName,
    objectives,
    rawScore: null,
    percentage: null,
    passed: false,
    indicatorsFilled: 0,
    indicatorsTotal: 0,
  };

  computeAllScores(sphere);

  return sphere;
}
