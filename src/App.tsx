import { useCallback, useState } from "react";
import { FileUploader } from "@/components/FileUploader";
import { Dashboard } from "@/components/Dashboard";
import { parseQualificationFile } from "@/lib/parser";
import type { GlobalStats, ParticipantData } from "@/lib/parser/types";
import { computeGlobalStats } from "@/lib/stats";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";

export function App() {
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleFiles = useCallback(
    async (files: File[]) => {
      setIsLoading(true);
      setErrors([]);
      const newErrors: string[] = [];
      const newParticipants: ParticipantData[] = [];

      for (const file of files) {
        try {
          const data = await parseQualificationFile(file);

          // Check for duplicates
          const isDuplicate = participants.some(
            (p) => p.totem === data.totem && p.nom === data.nom,
          );
          if (isDuplicate) {
            newErrors.push(
              `"${file.name}" ignoré: ${data.totem} (${data.prenom} ${data.nom}) déjà chargé`,
            );
            continue;
          }

          newParticipants.push(data);
        } catch (e) {
          newErrors.push(
            `Erreur "${file.name}": ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }

      const updated = [...participants, ...newParticipants];
      setParticipants(updated);
      setGlobalStats(updated.length > 0 ? computeGlobalStats(updated) : null);
      setErrors(newErrors);
      setIsLoading(false);
    },
    [participants],
  );

  const removeParticipant = useCallback(
    (index: number) => {
      const updated = participants.filter((_, i) => i !== index);
      setParticipants(updated);
      setGlobalStats(updated.length > 0 ? computeGlobalStats(updated) : null);
    },
    [participants],
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

        <FileUploader onFilesSelected={handleFiles} isLoading={isLoading} />

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
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">
                {participants.length} participant{participants.length > 1 ? "s" : ""}:
              </span>
              {participants.map((p, i) => (
                <Badge key={i} variant="secondary" className="gap-1 pr-1">
                  {p.totem}
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
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground text-xs"
                onClick={() => {
                  setParticipants([]);
                  setGlobalStats(null);
                }}
              >
                <Trash2 className="size-3" />
                Tout supprimer
              </Button>
            </div>

            {globalStats && (
              <Dashboard
                participants={participants}
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
