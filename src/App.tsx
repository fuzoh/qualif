import { useCallback, useMemo, useState } from "react";
import { FileUploader } from "@/components/FileUploader";
import { Dashboard } from "@/components/Dashboard";
import { parseQualificationFile } from "@/lib/parser";
import type { GlobalStats, ParticipantData, SphereId } from "@/lib/parser/types";
import { computeGlobalStats } from "@/lib/stats";
import { loadParticipants, saveParticipants, clearParticipants } from "@/lib/storage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDownWideNarrow, Trash2, X } from "lucide-react";
import { SPHERE_SHEETS } from "@/lib/parser/constants";

function initState(): { participants: ParticipantData[]; globalStats: GlobalStats | null } {
  const participants = loadParticipants();
  return {
    participants,
    globalStats: participants.length > 0 ? computeGlobalStats(participants) : null,
  };
}

export function App() {
  const [initial] = useState(initState);
  const [participants, setParticipants] = useState<ParticipantData[]>(initial.participants);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(initial.globalStats);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("");

  const updateParticipants = useCallback((updated: ParticipantData[]) => {
    setParticipants(updated);
    setGlobalStats(updated.length > 0 ? computeGlobalStats(updated) : null);
    saveParticipants(updated);
  }, []);

  const sortedParticipants = useMemo(() => {
    if (!sortBy) return participants;
    return [...participants].sort((a, b) => {
      if (sortBy === "name") {
        const aName = (a.totem || a.prenom).toLowerCase();
        const bName = (b.totem || b.prenom).toLowerCase();
        return aName.localeCompare(bName);
      }
      if (sortBy === "variance") {
        const variance = (p: ParticipantData) => {
          const pcts = p.spheres.map((s) => s.percentage).filter((v): v is number => v !== null);
          if (pcts.length < 2) return 0;
          const mean = pcts.reduce((a, b) => a + b, 0) / pcts.length;
          return pcts.reduce((a, v) => a + (v - mean) ** 2, 0) / pcts.length;
        };
        return variance(b) - variance(a);
      }
      // Sort by sphere id (A, B, C)
      const aScore = a.spheres.find((s) => s.id === sortBy)?.percentage ?? -1;
      const bScore = b.spheres.find((s) => s.id === sortBy)?.percentage ?? -1;
      return bScore - aScore;
    });
  }, [participants, sortBy]);

  const handleFiles = useCallback(
    async (files: File[]) => {
      setIsLoading(true);
      setErrors([]);
      const newErrors: string[] = [];
      const newParticipants: ParticipantData[] = [];

      for (const file of files) {
        try {
          const data = await parseQualificationFile(file);
          newParticipants.push(data);
        } catch (e) {
          newErrors.push(
            `Erreur "${file.name}": ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }

      // Merge: replace existing participants with same totem+nom, add new ones
      const updated = [...participants];
      for (const np of newParticipants) {
        const existingIdx = updated.findIndex(
          (p) => p.totem === np.totem && p.nom === np.nom,
        );
        if (existingIdx !== -1) {
          updated[existingIdx] = np;
        } else {
          updated.push(np);
        }
      }

      updateParticipants(updated);
      setErrors(newErrors);
      setIsLoading(false);
    },
    [participants, updateParticipants],
  );

  const removeParticipant = useCallback(
    (index: number) => {
      updateParticipants(participants.filter((_, i) => i !== index));
    },
    [participants, updateParticipants],
  );

  return (
    <div className="min-h-svh p-6">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div>
          <h1 className="text-xl font-bold">Synthèse des qualifications</h1>
          <p className="text-muted-foreground text-sm">
            Uploader les fichiers Excel de qualification pour voir la synthèse
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FileUploader onFilesSelected={handleFiles} isLoading={isLoading} />
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {participants.length > 0 && (
                <>
                  <span className="text-sm font-medium">
                    {participants.length} participant{participants.length > 1 ? "s" : ""}:
                  </span>
                  {participants.map((p, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {p.totem || p.prenom}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-4"
                        onClick={() => removeParticipant(i)}
                      >
                        <X className="size-3" />
                      </Button>
                    </Badge>
                  ))}
                </>
              )}
            </div>
            {participants.length > 0 && (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground text-xs"
                  onClick={() => {
                    updateParticipants([]);
                    clearParticipants();
                  }}
                >
                  <Trash2 className="size-3" />
                  Tout supprimer
                </Button>
              </div>
            )}
          </div>
        </div>

        {errors.length > 0 && (
          <div className="space-y-1">
            {errors.map((err, i) => (
              <div
                key={i}
                className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
              >
                {err}
              </div>
            ))}
          </div>
        )}

        {participants.length > 0 && (
          <>
            <div className="flex items-center gap-1.5 text-sm">
              <ArrowDownWideNarrow className="text-muted-foreground size-4" />
              <select
                className="border-input bg-background rounded border px-2 py-1 text-xs"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="">Pas de tri</option>
                <option value="name">Totem / Prénom</option>
                <option value="variance">Variance entre sphères</option>
                {SPHERE_SHEETS.map(({ id, sheetName }) => (
                  <option key={id} value={id}>
                    {sheetName}
                  </option>
                ))}
              </select>
            </div>

            {globalStats && (
              <Dashboard
                participants={sortedParticipants}
                globalStats={globalStats}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
