# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**namou** — Electron desktop app for restaurant reservation management (React + TypeScript + Vite). Targets Windows (NSIS installer via electron-builder).

## Commands

```bash
# Development
npm run dev              # Vite dev server only (port 3000)
npm run electron:dev     # Vite + Electron with hot reload

# Build
npm run build            # Vite production build → dist/
npm run electron:build   # Full Electron package → release/

# Build .exe without code signing (Windows)
npx cross-env CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --win --config.win.signAndEditExecutable=false

# TypeScript
npm run electron:compile # Compile electron/main.ts
```

No test runner or linter is configured.

## Architecture

**Electron main process:** `electron/main.ts` — creates BrowserWindow, loads Vite dev server (dev) or `dist/index.html` (prod).

**React app entry:** `index.html` → `src/main.tsx` → `src/App.tsx`

**App.tsx** wraps everything in a dnd-kit `DndContext` and renders:
- `Sidebar` (280px left panel) — reservation list with lunch/dinner tabs, drag source for waiting reservations
- `FloorMap` (center) — table floor plan with auto-sizing canvas, grid snap (12px), edit mode for table CRUD
- `TimeTable` (modal popup) — time slot grid view
- `NewReservationModal` — reservation form dialog

**State:** Single Zustand store (`src/store/useReservationStore.ts`) persisted to localStorage key `namou-storage`. Persists tables, reservations, and isSetupComplete. UI state (modals, selection, edit mode) is not persisted.

**Reservation flow:** `waiting` → `seated` (drag onto table) → `completed` (clear table). Fixed 90-minute duration, 15-minute slot intervals. Periods: lunch (12:00–14:00), dinner (19:00–21:30).

**Drag & drop:** dnd-kit pointer sensor (5px activation). Waiting reservations drag from Sidebar to DroppableTable in FloorMap.

**Table system:** Rectangle tables with merge/split support (mergedFrom tracks history). Positions snap to 12px grid. Table sizing: 72px wide, height = 60px base + 18px per extra seat beyond 2.

## Key Files

- `src/data/dummy.ts` — TypeScript types (Reservation, TableInfo), utility functions, and all constants (time slots, colors, dimensions)
- `src/lib/cn.ts` — `cn()` helper combining clsx + tailwind-merge
- `src/store/useReservationStore.ts` — all app state and actions

## Styling

Tailwind CSS with a wood-themed palette defined in `src/index.css` as CSS custom properties: cream (#F7F3ED), surface (#FEFCF9), primary (#8B6F47), charcoal (#3A3128), occupied (#C75B3F), available (#5B8C5A), reserved (#C4A44A).

## Notes

- Phone numbers use French format (06 12 34 56 78 or +33 prefix)
- Setup wizard shows on first launch; once completed, the app enters operational mode
- Documentation in PROGRESS.md is in Korean
