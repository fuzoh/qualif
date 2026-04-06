import type * as XLSX from "xlsx";
import { SYNTHESE_CELLS } from "./constants";

export interface ParticipantMeta {
  totem: string;
  prenom: string;
  nom: string;
  cours: string;
  date: string;
}

function readCell(sheet: XLSX.WorkSheet, addr: string): string {
  const cell = sheet[addr];
  if (!cell || cell.v === undefined || cell.v === null) return "";
  return String(cell.v).trim();
}

export function parseSynthese(sheet: XLSX.WorkSheet): ParticipantMeta {
  return {
    totem: readCell(sheet, SYNTHESE_CELLS.TOTEM),
    prenom: readCell(sheet, SYNTHESE_CELLS.PRENOM),
    nom: readCell(sheet, SYNTHESE_CELLS.NOM),
    cours: readCell(sheet, SYNTHESE_CELLS.COURS),
    date: readCell(sheet, SYNTHESE_CELLS.DATE),
  };
}
