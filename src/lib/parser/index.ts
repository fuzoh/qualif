import type { ParticipantData, Sphere } from "./types";
import { SPHERE_SHEETS, SYNTHESE_SHEET } from "./constants";
import { parseSphere } from "./sphere";
import { parseSynthese } from "./synthese";

export type { ParticipantData } from "./types";
export type { GlobalStats, SphereId } from "./types";

export async function parseQualificationFile(
  file: File,
): Promise<ParticipantData> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  // Validate required sheets exist
  const missing = [
    SYNTHESE_SHEET,
    ...SPHERE_SHEETS.map((s) => s.sheetName),
  ].filter((name) => !workbook.SheetNames.includes(name));

  if (missing.length > 0) {
    throw new Error(
      `Feuilles manquantes dans "${file.name}": ${missing.join(", ")}`,
    );
  }

  const meta = parseSynthese(workbook.Sheets[SYNTHESE_SHEET]);

  const spheres = SPHERE_SHEETS.map(({ id, sheetName }) =>
    parseSphere(workbook.Sheets[sheetName], id, sheetName),
  ) as [Sphere, Sphere, Sphere];

  let commentsFilled = 0;
  let commentsTotal = 0;
  for (const sphere of spheres) {
    for (const obj of sphere.objectives) {
      commentsTotal++;
      if (obj.comment !== null && obj.comment.trim() !== "") {
        commentsFilled++;
      }
    }
  }

  return {
    fileName: file.name,
    totem: meta.totem,
    prenom: meta.prenom,
    nom: meta.nom,
    cours: meta.cours,
    date: meta.date,
    spheres,
    objectiveCommentsFilled: commentsFilled,
    objectiveCommentsTotal: commentsTotal,
  };
}
