# Plan: Dashboard de synthese des qualifications scoutes

## Context

Bastien organise un cours de chef de camp JS (PBS CH NE 221-26, avril 2026). Chaque participant a un fichier Excel de qualification avec le meme template. Il faut une mini app web pour uploader ces fichiers et voir une synthese globale de l'avancement des evaluations.

**Stack**: React + shadcn/ui (scaffold prepare par l'utilisateur) + parsing Excel cote navigateur (SheetJS). Pas de backend, tout en memoire.

---

## 1. Modele de donnees (`src/lib/parser/types.ts`)

```
Indicator { row, label(E), score(H, 1-5|null), comment(K) }
Criterion { row, label(D), weight(G, 1|2), indicators[], averageScore }
Objective { row, label(C), weight(F, 1|2), comment(K), criteria[], rawScore, percentage, indicatorsFilled/Total, allFilledButNoComment }
Sphere { id(A|B|C), name, objectives[], percentage, passed(>=80%), indicatorsFilled/Total }
ParticipantData { fileName, totem(D3), prenom(D4), nom(D5), spheres[3], objectiveCommentsFilled/Total }
GlobalStats { sphereMeans/Variances, objectiveMeans/Variances }
```

## 2. Parsing Excel (`src/lib/parser/`)

**Lib**: `xlsx` (SheetJS) — lecture seule cote navigateur, pas de formules evaluees.

**`constants.ts`** — noms des feuilles: `"A - Techniques JS"`, `"B - Organisation"`, `"C - Scoutisme"`, `"Synthese"`

**`synthese.ts`** — lire les cellules D3 (totem), D4 (prenom), D5 (nom), H3 (cours), H5 (date)

**`sphere.ts`** — algorithme principal:
- Parcourir les lignes a partir de la ligne 11
- Detecter le niveau hierarchique par la colonne contenant du texte:
  - **C non-vide** → nouvel Objectif (poids en F, commentaire en K)
  - **D non-vide** → nouveau Critere (poids en G)
  - **E non-vide** → Indicateur (note en H, commentaire en K)
- Construire l'arbre Objectif > Critere > Indicateur

**`scoring.ts`** — recalcul complet (les formules Excel ne sont pas evaluees):
- Moyenne critere = mean des indicateurs non-nuls (score > 0)
- Score objectif = moyenne ponderee des criteres (poids G)
- Score sphere = moyenne ponderee des objectifs (poids F)
- **Mapping score→pourcentage** (formule Excel): `n <= 3 ? (n-1)/2 : 1 + (n-3)*0.25`
  - 1→0%, 2→50%, 3→100%, 4→125%, 5→150%
- Seuil de reussite: pourcentage >= 0.8 (80%)

**Score 0 = non observe** (meme traitement que cellule vide).

## 3. Statistiques globales (`src/lib/stats.ts`)

- Pour chaque sphere et chaque objectif: moyenne et variance sur tous les participants
- Ne compter que les participants ayant au moins un indicateur rempli pour la sphere/objectif

## 4. Composants React

```
App.tsx                     — state: ParticipantData[], gere upload + parsing
  FileUploader.tsx          — zone drag-and-drop, accepte multiple .xlsx
  Dashboard.tsx             — grille horizontale scrollable
    RowLabels.tsx           — colonne gauche fixe (noms spheres 14pt, objectifs 12pt)
    ParticipantColumn.tsx   — une colonne par participant
      SphereCell.tsx        — pourcentage + taux de remplissage indicateurs
      ObjectiveCell.tsx     — pourcentage, ROUGE si notes completes mais commentaire manquant
    GlobalStatsColumn.tsx   — colonne droite: moyenne ± variance
```

**Layout**: `<Table>` shadcn/ui ou CSS Grid. Colonne gauche sticky, scroll horizontal pour les participants.

## 5. Regles d'affichage

| Element | Style | Contenu |
|---------|-------|---------|
| Sphere | 14pt, bold | `85%` + badge Reussi/Echoue + `45/99 indicateurs` en dessous |
| Objectif | 12pt | `90%` + variance en petit a cote |
| Objectif ROUGE | fond rouge | quand TOUS les indicateurs remplis ET commentaire objectif (K) vide |
| Commentaires manquants | par participant | `3/15 commentaires a completer` en pied de colonne |
| Colonne globale | idem | `78% ±6%` (variance en plus petit) |

## 6. Cas limites

- Score 0 et cellule vide = "non observe" (exclure des moyennes)
- Critere sans aucun indicateur rempli → null, exclu de la moyenne objectif
- Objectif sans critere rempli → null, exclu de la moyenne sphere
- Sphere entierement vide → afficher "–"
- Fichiers invalides (mauvais template) → erreur descriptive
- Doublons (meme totem+nom) → avertir et ignorer

## 7. Ordre d'implementation

1. Types + constantes
2. Module scoring (fonctions pures)
3. Parseur sphere (parcours des lignes)
4. Parseur synthese (metadata participant)
5. Entrypoint parseur (lecture File → ParticipantData)
6. Module stats (mean/variance)
7. FileUploader
8. Dashboard + colonnes + cellules
9. Styling + highlights rouges

## 8. Verification

- Uploader le fichier template `0_Qualif 2026_document de travail.xlsx` → doit parser sans erreur, afficher "Toto Tutu / Kangourou" avec toutes les valeurs a 0 / "–"
- Modifier manuellement quelques notes dans une copie du fichier et verifier que les pourcentages correspondent
- Tester avec 2+ fichiers pour verifier la colonne globale (moyennes, variances)
- Verifier le highlight rouge: remplir tous les indicateurs d'un objectif sans mettre de commentaire → doit apparaitre en rouge
