# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dashboard web app for tracking scout qualification evaluations. Parses Excel (.xlsx) qualification files in the browser and displays a synthesis of all participants' progress. No backend — everything runs client-side in memory.

## Commands

- `bun dev` — start Vite dev server
- `bun run build` — typecheck + production build
- `bun run lint` — ESLint
- `bun run format` — Prettier
- `bun run typecheck` — TypeScript check only
- `bunx shadcn@latest add <component>` — add shadcn/ui components

Python tooling (for Excel analysis scripts only):
- `uv add <pkg>` — install Python packages
- `uv run <script>` — run Python scripts

## Tech Stack

- React 19 + TypeScript 5.9, Vite 7, Bun
- Tailwind CSS 4 (via `@tailwindcss/vite` plugin, no tailwind.config — uses CSS-first config in `src/index.css`)
- shadcn/ui v4 with `base-lyra` style, `@base-ui/react` primitives, `lucide-react` icons
- Path aliases: `@/components`, `@/lib`, `@/hooks` (configured in `tsconfig.app.json`)

## Architecture

See `plan.md` for the full implementation plan.

**Excel parsing** (`src/lib/parser/`): Reads .xlsx files using SheetJS (`xlsx`). Each file = one participant. The parser walks sphere sheets ("A - Techniques JS", "B - Organisation", "C - Scoutisme") row by row from row 11, detecting hierarchy by column: C = Objective, D = Criterion, E = Indicator. Scores are in column H (1-5 scale), comments in column K. All scoring is recomputed in JS since Excel formulas aren't evaluated by SheetJS.

**Scoring formula**: `score <= 3 ? (score-1)/2 : 1 + (score-3)*0.25` — maps 1-5 scale to percentage where 3 = 100%. Pass threshold: 80%.

**Key rule**: Score of 0 and empty cells both mean "not observed" — exclude from averages.

## Reference Data

`0_Qualif 2026_document de travail.xlsx` — template Excel file used for development and testing.
