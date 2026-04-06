import type { ParticipantData } from "./parser/types";

const STORAGE_KEY = "qualif-participants";

export function loadParticipants(): ParticipantData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ParticipantData[];
  } catch {
    return [];
  }
}

export function saveParticipants(participants: ParticipantData[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(participants));
}

export function clearParticipants(): void {
  localStorage.removeItem(STORAGE_KEY);
}
