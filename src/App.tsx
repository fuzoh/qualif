import { useCallback, useEffect, useMemo, useState } from "react"
import { FileUploader } from "@/components/FileUploader"
import { Dashboard } from "@/components/Dashboard"
import { parseQualificationFile } from "@/lib/parser"
import type { ParticipantData } from "@/lib/parser/types"
import { computeGlobalStats } from "@/lib/stats"
import { loadParticipants, saveParticipants } from "@/lib/storage"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowDownWideNarrow, Trash2, X } from "lucide-react"
import { SPHERE_SHEETS } from "@/lib/parser/constants"

export function App() {
  const [participants, setParticipants] = useState<ParticipantData[]>(
    loadParticipants
  )
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>("")

  const globalStats = useMemo(
    () => (participants.length > 0 ? computeGlobalStats(participants) : null),
    [participants]
  )

  useEffect(() => {
    saveParticipants(participants)
  }, [participants])

  const sortedParticipants = useMemo(() => {
    if (!sortBy) return participants

    const computeKey = (p: ParticipantData): number | string => {
      switch (sortBy) {
        case "name":
          return (p.totem || p.prenom).toLowerCase()
        case "variance": {
          const pcts = p.spheres
            .map((s) => s.percentage)
            .filter((v): v is number => v !== null)
          if (pcts.length < 2) return 0
          const mean = pcts.reduce((a, b) => a + b, 0) / pcts.length
          return pcts.reduce((a, v) => a + (v - mean) ** 2, 0) / pcts.length
        }
        case "overall": {
          const pcts = p.spheres
            .map((s) => s.percentage)
            .filter((v): v is number => v !== null)
          return pcts.length > 0
            ? pcts.reduce((a, b) => a + b, 0) / pcts.length
            : -1
        }
        case "comments":
          return p.objectiveCommentsTotal - p.objectiveCommentsFilled
        default:
          return p.spheres.find((s) => s.id === sortBy)?.percentage ?? -1
      }
    }

    const keyed = participants.map((p) => ({ p, key: computeKey(p) }))
    keyed.sort((a, b) => {
      if (typeof a.key === "string" && typeof b.key === "string")
        return a.key.localeCompare(b.key)
      return (b.key as number) - (a.key as number)
    })
    return keyed.map(({ p }) => p)
  }, [participants, sortBy])

  const handleFiles = useCallback(async (files: File[]) => {
    setIsLoading(true)
    setErrors([])
    const newErrors: string[] = []
    const newParticipants: ParticipantData[] = []

    for (const file of files) {
      try {
        const data = await parseQualificationFile(file)
        newParticipants.push(data)
      } catch (e) {
        newErrors.push(
          `Erreur "${file.name}": ${e instanceof Error ? e.message : String(e)}`
        )
      }
    }

    setParticipants((prev) => {
      const updated = [...prev]
      for (const np of newParticipants) {
        const existingIdx = updated.findIndex(
          (p) => p.totem === np.totem && p.nom === np.nom
        )
        if (existingIdx !== -1) {
          updated[existingIdx] = np
        } else {
          updated.push(np)
        }
      }
      return updated
    })
    setErrors(newErrors)
    setIsLoading(false)
  }, [])

  const removeParticipant = useCallback((fileName: string) => {
    setParticipants((prev) => prev.filter((p) => p.fileName !== fileName))
  }, [])

  return (
    <div className="min-h-svh p-2">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">Synthèse des qualifications</h1>
          <p className="text-sm text-muted-foreground">
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
                    {participants.length} participant
                    {participants.length > 1 ? "s" : ""}:
                  </span>
                  {participants.map((p) => (
                    <Badge key={p.fileName} variant="secondary" className="gap-1 pr-1">
                      {p.totem || p.prenom}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-4"
                        onClick={() => removeParticipant(p.fileName)}
                      >
                        <X className="size-3" />
                      </Button>
                    </Badge>
                  ))}
                </>
              )}
            </div>
            {participants.length > 0 && (
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => setParticipants([])}
                >
                  <Trash2 className="size-3" />
                  Tout supprimer
                </Button>
                <span className="flex items-center gap-1.5">
                  <ArrowDownWideNarrow className="size-4 text-muted-foreground" />
                  <select
                    className="rounded border border-input bg-background px-2 py-1 text-xs"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="">Pas de tri</option>
                    <option value="overall">Meilleur global</option>
                    <option value="name">Totem / Prénom</option>
                    <option value="variance">Variance entre sphères</option>
                    <option value="comments">Commentaires à compléter</option>
                    {SPHERE_SHEETS.map(({ id, sheetName }) => (
                      <option key={id} value={id}>
                        {sheetName}
                      </option>
                    ))}
                  </select>
                </span>
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
  )
}

export default App
