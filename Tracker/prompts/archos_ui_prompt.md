# ArchOS UI/UX Rewrite – Implementation Prompt (Pure‑JS Toolchain)

**Date**: 2025-11-09 (UTC)  
**Objective**: Completely rewrite the UI/UX so it runs **natively on ArchOS** without crashing or relying on unsupported native binaries.  
**Key Rule**: Use a **pure‑JavaScript (no native)** toolchain for dev & build. **All assets under `assets/`**.

---


## 0) Context & Non‑Goals
- The prior Vite stack crashed on CatchyOS/ArchOS (SIGBUS before diagnostics) due to **esbuild** native binary.  
- Non‑goals: supporting Playwright/E2E within ArchOS workspace; shipping native node add‑ons. E2E can be run in a container elsewhere.

---

## 1) Constraints on ArchOS
- **No native deps** (no esbuild, swc, parcel native libs, rspack, turbopack, node‑gyp).  
- **Pure‑JS transforms only** (Sucrase/Babel in JS mode).  
- **ESM** throughout; avoid CommonJS shims.  
- **Workers** allowed (prefer for battle sims).  
- **Assets root**: `assets/` (sprites, icons, sfx, music, fonts).

---

## 2) Toolchain (Pure‑JS)
- **Dev server**: `@web/dev-server` (ESM http server, no native deps).  
- **TS/JSX transform**: `sucrase` (pure JS) for dev; `rollup` + `@rollup/plugin-sucrase` for prod build (rollup core is JS).  
- **CSS**: PostCSS (JS) + `postcss-preset-env`. Tailwind is optional but slower; if used, run JIT via Node only.  
- **Testing**: **Jest** + **happy-dom** (JS) for unit/integration. (Do not use Vitest/Vite).  
- **Lint/Format**: ESLint + Prettier (JS).  
- **No Type‑checking on transform**: run `tsc --noEmit` separately.

> Why not Babel? You may use `@babel/core` in JS mode if needed. Avoid plugins that pull native deps.

---

## 3) Project Layout
```
apps/ui-archos/
  index.html
  assets/               # images, icons, audio, fonts
  src/
    main.tsx
    app.tsx
    routes/
      Battle.tsx
      Hero.tsx
      Skills.tsx
      Creator.tsx
      Settings.tsx
      LoadSave.tsx
      NotFound.tsx
    components/
      layout/
      battle/
      hero/
      skills/
      creator/
      common/
    services/
      engineBridge.ts      # wraps existing engine modules
      dice.ts
      rangeCurves.ts
      httpClient.ts        # YAML-over-HTTP loader re-used
    state/
      useBattleStore.ts    # Zustand-like minimal store (write your own or tiny-store)
      useHeroStore.ts
      useContentStore.ts
    workers/
      battleWorker.ts      # heavy sim
    styles/
    typings/
  web-dev-server.config.mjs
  rollup.config.mjs
  jest.config.mjs
  tsconfig.json
  package.json
```

---

## 4) NPM Scripts
- `dev`: `web-dev-server --config web-dev-server.config.mjs`  
- `build`: `rollup -c rollup.config.mjs`  
- `serve:prod`: `npx http-server dist`  
- `typecheck`: `tsc --noEmit`  
- `test`: `jest --runInBand`  
- `lint`: `eslint "src/**/*.{ts,tsx}"`  
- `format`: `prettier -w .`

**Environment**: no `ESBUILD_BINARY_PATH` needed; esbuild not installed.

---

## 5) Configs (Sketch)

### web-dev-server.config.mjs
```js
export default {
  rootDir: 'apps/ui-archos',
  nodeResolve: true,
  watch: true,
  appIndex: 'apps/ui-archos/index.html',
  middleware: [sucraseMiddleware()]
};

async function sucraseMiddleware() {
  const { transform } = await import('sucrase');
  return async (ctx, next) => {
    await next();
    if (ctx.path.endsWith('.ts') || ctx.path.endsWith('.tsx')) {
      const out = transform(ctx.body.toString(), { transforms: ['typescript','jsx'] });
      ctx.body = out.code;
      ctx.set('Content-Type','application/javascript');
    }
  };
}
```

### rollup.config.mjs
```js
import sucrase from '@rollup/plugin-sucrase';
import copy from 'rollup-plugin-copy';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'apps/ui-archos/src/main.tsx',
  output: {
    dir: 'dist',
    format: 'esm',
    sourcemap: true
  },
  treeshake: true,
  plugins: [
    nodeResolve({ browser: true, preferBuiltins: false }),
    commonjs(),
    sucrase({ exclude: ['node_modules/**'], transforms: ['typescript','jsx'] }),
    copy({ targets: [
      { src: 'apps/ui-archos/index.html', dest: 'dist' },
      { src: 'apps/ui-archos/assets/**/*', dest: 'dist/assets' }
    ]})
  ]
};
```

### jest.config.mjs
```js
export default {
  testEnvironment: 'happy-dom',
  transform: {}, // no ts-jest; compile-time typecheck via tsc
  moduleFileExtensions: ['ts','tsx','js','jsx','json'],
  setupFilesAfterEnv: ['<rootDir>/apps/ui-archos/test/setup.ts']
};
```

---

## 6) UI/UX Requirements (Functionally Equivalent)
- **Battle Screen**: timeline (SPD reorder), board canvas/SVG, unit panel, action bar, distance prompt for [Snipe]/[Shotgun], logs, add/remove unit.
- **Hero Screen**: stat editor with Potential variance highlight, tier-up flow, portrait/bio, **skill link graph** (Owned/Available/Locked).
- **Skills Screen**: filters, detail drawer, acquire validation (tier/links/PT).
- **Creator Screen**: create/edit Skill/Character/Terrain/Buff/Debuff/Effect; YAML/JSON preview; import pipeline.
- **Load/Save**: slots + JSON export/import.
- **Settings**: range curves, RNG seed, accessibility toggles.
- **All assets**: referenced under `assets/` only.

---

## 7) Engine Bridge
- Import pure TS engine modules directly (`src/core/...`) as ESM.
- Offload heavy sims to `battleWorker.ts`; communicate via `postMessage` (no SharedArrayBuffer).
- Keep existing YAML-over-HTTP loader (`src/services/httpClient.ts`), pointing to shared `data/`.

---

## 8) Accessibility & Input
- Full keyboard support (Tab, arrows, Enter, Esc, 1–9 for skills, `D` for distance).
- WCAG AA contrast and focus rings.
- Screen reader labels on action buttons, timeline entries, and effects badges.

---

## 9) Testing Plan (Jest + happy-dom)
- **Unit**: reducers/stores, distance math, PT variance banner logic, skill availability OR‑links.
- **Integration**: engineBridge + components (simulate actions, assert DOM/logs).
- **Snapshots**: Skill graph ASCII/JSON representation for deterministic tests (no ANSI colors).

---

## 10) Performance Targets
- Initial load < 1.5 MB gz (ESM, treeshake).
- 60fps animation on timeline/board (CSS transforms).
- Worker isolates O(n log n) scheduling & damage sims.

---

## 11) Migration Steps
1. Create `apps/ui-archos/` alongside the old UI.
2. Copy `assets/` into `apps/ui-archos/assets/` (or symlink).
3. Port routes/components; replace Vite APIs with web‑dev‑server ESM imports.
4. Replace Vite/Vitest deps with `@web/dev-server`, `rollup`, `@rollup/plugin-sucrase`, `jest`, `happy-dom`.
5. Add `npm scripts` above.
6. Update docs: README, requirements, change list.
7. Delete any esbuild/swc-related packages from `apps/ui-archos/package.json`.

---

## 12) Acceptance Criteria
1. **Boots on ArchOS**: `npm run dev` serves `index.html` and hot reloads without SIGBUS.
2. **Battle Loop Parity**: SPD reorder, effect tick-after-turn, [Snipe]/[Shotgun] distance prompt, multi-hit preview, summons lifecycle—all visible and operable.
3. **Skill Graph OR‑links**: With Slash (not Pierce), Triple Thrust (links=[Slash,Pierce]) shows **Available**.
4. **Creator Import**: Paste valid YAML skill → appears in list; invalid shows schema errors.
5. **Assets Policy**: All images/icons/sfx/fonts resolve under `assets/` paths.
6. **Type Safety**: `npm run typecheck` passes (noEmit).
7. **Tests**: `npm test` runs Jest suite green under ArchOS.
8. **No Native Binaries**: `npm ls` shows no esbuild/swc/rspack binaries.

---

## 13) Deliverables
- `apps/ui-archos` app meeting criteria.
- Updated docs (README, requirements, change list).
- Jest test suite + basic snapshots.
- Rollup production build in `dist/`.

---

## 14) Optional (Outside ArchOS)
- Containerized E2E (Playwright) for CI only (Debian/Ubuntu).
- Artifact deploy preview via static server.
