import { useState } from "react";
import type { GlobalStats, ParticipantData, Sphere, SphereId } from "@/lib/parser/types";
import { computeThresholdPercentage } from "@/lib/parser/scoring";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardProps {
  participants: ParticipantData[];
  globalStats: GlobalStats;
}

function formatPct(value: number | null): string {
  if (value === null) return "–";
  return `${Math.round(value * 100)}%`;
}

function pctColorClass(value: number | null): string {
  if (value === null) return "";
  const pct = value * 100;
  if (pct < 80) return "text-red-600 dark:text-red-400";
  if (pct < 90) return "text-orange-600 dark:text-orange-400";
  if (pct <= 110) return "text-green-600 dark:text-green-400";
  return "text-blue-600 dark:text-blue-400";
}

const SPHERE_HEADER_BG: Record<string, string> = {
  A: "bg-yellow-100 dark:bg-yellow-950/50",
  B: "bg-blue-100 dark:bg-blue-950/50",
  C: "bg-green-100 dark:bg-green-950/50",
};

function formatVariance(variance: number): string {
  return `±${Math.round(Math.sqrt(variance) * 100)}%`;
}

function PassBadge({ passed }: { passed: boolean }) {
  return (
    <Badge variant={passed ? "default" : "destructive"} className="text-[10px]">
      {passed ? "Réussi" : "Échoué"}
    </Badge>
  );
}

function SphereRow({
  sphere,
  participants,
  globalStats,
  sphereIndex,
  collapsed,
  onToggle,
}: {
  sphere: Sphere;
  participants: ParticipantData[];
  globalStats: GlobalStats;
  sphereIndex: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const sphereId = sphere.id;
  const gStats = globalStats.spheres[sphereId];

  return (
    <>
      {/* Sphere header row */}
      <tr className={cn("border-t-2 border-foreground/20", SPHERE_HEADER_BG[sphereId])}>
        <td className={cn("sticky left-0 z-10 max-w-[250px] py-2 pr-4 pl-2 font-bold break-words", SPHERE_HEADER_BG[sphereId] ?? "bg-background")} style={{ fontSize: "14px" }}>
          <button
            onClick={onToggle}
            className="flex items-center gap-1"
          >
            {collapsed
              ? <ChevronRight className="size-4 shrink-0" />
              : <ChevronDown className="size-4 shrink-0" />}
            {sphere.name}
          </button>
        </td>
        {participants.map((p, pi) => {
          const s = p.spheres[sphereIndex];
          return (
            <td key={pi} className="px-4 py-2 text-center">
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2" style={{ fontSize: "14px" }}>
                  <span className={cn("font-bold", pctColorClass(s.percentage))}>{formatPct(s.percentage)}</span>
                  <PassBadge passed={s.passed} />
                </div>
                <div className="text-muted-foreground text-[11px]">
                  {s.indicatorsFilled}/{s.indicatorsTotal} indicateurs
                </div>
              </div>
            </td>
          );
        })}
        <td className="bg-muted/50 px-4 py-2 text-center">
          <div className="flex flex-col items-center gap-1" style={{ fontSize: "14px" }}>
            <span className={cn("font-bold", gStats ? pctColorClass(gStats.mean) : "")}>
              {gStats ? formatPct(gStats.mean) : "–"}
            </span>
            {gStats && (
              <span className="text-muted-foreground text-[10px]">
                {formatVariance(gStats.variance)}
              </span>
            )}
          </div>
        </td>
      </tr>

      {/* Objective rows */}
      {!collapsed &&
        sphere.objectives.map((obj, oi) => {
          const gObjStats = globalStats.objectives[`${sphereId}-${oi}`];
          return (
            <tr key={oi} className="border-t border-muted">
              <td
                className="sticky left-0 z-10 max-w-[250px] bg-background py-1.5 pr-4 pl-4 break-words"
                style={{ fontSize: "12px" }}
              >
                {obj.label}
              </td>
              {participants.map((p, pi) => {
                const pSphere = p.spheres[sphereIndex];
                const pObj = pSphere.objectives[oi];
                if (!pObj) return <td key={pi} className="px-4 text-center">–</td>;

                // If objective has no score, show hint
                if (pObj.percentage === null) {
                  const hint = computeThresholdPercentage(pSphere, oi);
                  return (
                    <td key={pi} className="px-4 py-1.5 text-center" style={{ fontSize: "12px" }}>
                      {hint !== null ? (
                        <span className="text-muted-foreground/60 text-[11px]">
                          {pSphere.passed ? `< ${formatPct(hint)}` : `> ${formatPct(hint)}`}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                    </td>
                  );
                }

                return (
                  <td
                    key={pi}
                    className={cn(
                      "px-4 py-1.5 text-center",
                      pObj.allFilledButNoComment && "bg-red-100 dark:bg-red-950",
                    )}
                    style={{ fontSize: "12px" }}
                  >
                    <span className={cn("font-medium", pctColorClass(pObj.percentage))}>{formatPct(pObj.percentage)}</span>
                    {pObj.allFilledButNoComment && (
                      <div className="text-[10px] font-medium text-red-600 dark:text-red-400">
                        Commentaire manquant
                      </div>
                    )}
                  </td>
                );
              })}
              <td
                className="bg-muted/50 px-4 py-1.5 text-center"
                style={{ fontSize: "12px" }}
              >
                <span className={cn("font-medium", gObjStats ? pctColorClass(gObjStats.mean) : "")}>
                  {gObjStats ? formatPct(gObjStats.mean) : "–"}
                </span>
                {gObjStats && (
                  <span className="text-muted-foreground ml-1 text-[10px]">
                    {formatVariance(gObjStats.variance)}
                  </span>
                )}
              </td>
            </tr>
          );
        })}
    </>
  );
}

export function Dashboard({ participants, globalStats }: DashboardProps) {
  if (participants.length === 0) return null;

  const refSpheres = participants[0].spheres;

  const [collapsedSpheres, setCollapsedSpheres] = useState<Record<SphereId, boolean>>({
    A: true,
    B: true,
    C: true,
  });

  const toggleSphere = (id: SphereId) => {
    setCollapsedSpheres((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="overflow-x-auto rounded border">
      <table className="w-max min-w-full border-collapse">
        <colgroup>
          <col className="w-[250px] max-w-[250px]" />
        </colgroup>
        <thead className="sticky top-0 z-20">
          <tr className="border-b-2 bg-muted">
            <th className="sticky left-0 z-30 max-w-[250px] bg-muted py-2 pr-4 pl-2 text-left">
              Participant
            </th>
            {participants.map((p, i) => {
              const allPassed = p.spheres.every((s) => s.passed);
              return (
                <th key={i} className="min-w-[140px] bg-muted px-4 pb-2 text-center">
                  <Badge
                    variant={allPassed ? "default" : "destructive"}
                    className="mb-1 text-[10px]"
                  >
                    {allPassed ? "Réussi" : "Échoué"}
                  </Badge>
                  <div className="font-bold">{p.totem || p.prenom}</div>
                  {(() => {
                    const pcts = p.spheres.map((s) => s.percentage).filter((v): v is number => v !== null);
                    if (pcts.length < 2) return null;
                    const mean = pcts.reduce((a, b) => a + b, 0) / pcts.length;
                    const variance = pcts.reduce((a, v) => a + (v - mean) ** 2, 0) / pcts.length;
                    const total = Math.round(mean * 100);
                    const objPcts = p.spheres.flatMap((s) => s.objectives.map((o) => o.percentage)).filter((v): v is number => v !== null);
                    const objVarianceStr = objPcts.length >= 2
                      ? (() => {
                          const objMean = objPcts.reduce((a, b) => a + b, 0) / objPcts.length;
                          const objVar = objPcts.reduce((a, v) => a + (v - objMean) ** 2, 0) / objPcts.length;
                          return ` (${formatVariance(objVar)})`;
                        })()
                      : "";
                    return (
                      <div className="text-muted-foreground text-[10px] font-normal">
                        {formatVariance(variance)} &middot; {total}%{objVarianceStr}
                      </div>
                    );
                  })()}
                </th>
              );
            })}
            <th className="bg-muted/50 min-w-[140px] px-4 pb-2 text-center">
              <div className="font-bold">Global</div>
              <div className="text-muted-foreground text-xs font-normal">
                Moyenne
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {refSpheres.map((sphere, si) => (
            <SphereRow
              key={sphere.id}
              sphere={sphere}
              participants={participants}
              globalStats={globalStats}
              sphereIndex={si}
              collapsed={collapsedSpheres[sphere.id]}
              onToggle={() => toggleSphere(sphere.id)}
            />
          ))}

          {/* Comment fill rate footer */}
          <tr className="border-t-2 border-foreground/20 bg-muted">
            <td className="sticky left-0 z-10 max-w-[250px] bg-muted pt-3 pr-4 pl-2 text-sm font-medium break-words">
              Commentaires d&apos;objectifs
            </td>
            {participants.map((p, i) => {
              const missing =
                p.objectiveCommentsTotal - p.objectiveCommentsFilled;
              return (
                <td key={i} className="px-4 pt-3 text-center text-xs">
                  {missing > 0 ? (
                    <span className="text-orange-600 dark:text-orange-400">
                      {missing}/{p.objectiveCommentsTotal} à compléter
                    </span>
                  ) : (
                    <span className="text-green-600 dark:text-green-400">
                      Tous complétés
                    </span>
                  )}
                </td>
              );
            })}
            <td className="bg-muted/50 px-4 pt-3" />
          </tr>

          {/* Completion progress bar row */}
          <tr className="bg-muted">
            <td className="sticky left-0 z-10 max-w-[250px] bg-muted py-2 pr-4 pl-2 text-sm font-medium break-words">
              Complétude
            </td>
            {participants.map((p, i) => {
              let totalFilled = 0;
              let totalIndicators = 0;
              for (const s of p.spheres) {
                totalFilled += s.indicatorsFilled;
                totalIndicators += s.indicatorsTotal;
              }
              const pct = totalIndicators > 0 ? Math.round((totalFilled / totalIndicators) * 100) : 0;
              return (
                <td key={i} className="px-4 py-2">
                  <Progress value={pct} className="w-full">
                    <span className="text-muted-foreground w-full text-center text-[10px] tabular-nums">
                      {pct}%
                    </span>
                  </Progress>
                </td>
              );
            })}
            <td className="bg-muted/50 px-4 py-2" />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
