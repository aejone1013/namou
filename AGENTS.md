# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the app code. UI components live in `src/components/`, store logic and policies in `src/store/`, shared helpers in `src/lib/`, and seeded table/reservation data in `src/data/`. Integration and UI tests sit next to the code they verify, for example `src/store/*.integration.test.ts` and `src/components/control-panel/*.ui.test.tsx`. Static assets are under `public/` and `src/assets/`. Electron entrypoints are in `electron/`, and Android/Capacitor files are in `android/`.

## Build, Test, and Development Commands
Use `npm install` once to install dependencies.

- `npm run dev`: start the Vite web app locally.
- `npm run electron:dev`: run Vite and Electron together for desktop testing.
- `npm run build`: create the production web build.
- `npm run typecheck`: run `tsc --noEmit`.
- `npm run test:store-integration`: run the main Vitest store integration suite.
- `npm run check`: run typecheck, policy tests, integration tests, Electron compile, and production build.
- `npm run android:apk`: build the web app, sync Capacitor, and assemble a debug APK.

## Coding Style & Naming Conventions
This repo uses TypeScript, React, and Zustand. Follow the existing style: 2-space indentation, semicolons omitted, and single quotes. Use `PascalCase` for React components, `camelCase` for functions and store actions, and descriptive test names such as `useReservationStore.walkin.integration.test.ts`. Prefer colocated tests and keep domain logic in `src/store/` instead of UI components.

## Testing Guidelines
Vitest is the main test runner, with `jsdom` configured in `vitest.config.ts`. Use `*.test.ts` for logic tests, `*.integration.test.ts` for store flows, and `*.ui.test.tsx` for component behavior. Add or update tests whenever table layout, merge rules, or reservation assignment logic changes. Run targeted suites first, then `npm run check` before opening a PR.

## Commit & Pull Request Guidelines
Recent history uses Conventional Commits such as `feat: ...` and `chore: ...`; continue that format. Keep commit subjects short and action-oriented. PRs should include a clear summary, affected areas, test coverage notes, and screenshots or short recordings for UI changes. Link the relevant issue when one exists.

## Configuration & Platform Notes
Do not commit secrets or machine-specific config. Review `capacitor.config.ts`, `electron/`, and `android/` changes carefully because they affect packaging and platform builds in addition to the web app.
