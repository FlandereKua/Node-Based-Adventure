# ArchOS UI

Pure-JavaScript React UI that runs on ArchOS using @web/dev-server + Rollup + Sucrase.

## Scripts

```bash
npm install
npm run dev        # web-dev-server + sucrase
npm run build      # rollup + sucrase + asset copy
npm run serve:prod # http-server dist
npm run typecheck  # tsc --noEmit
npm run test       # jest + happy-dom
npm run lint       # eslint
npm run format     # prettier
```

## Structure
- `src/` React routes/components mirrored from the CLI feature set.
- `services/engineBridge.ts` bridges to the existing battle engine.
- `workers/battleWorker.ts` performs heavy sims off the main thread.
- `assets/` must contain all images/icons/audio/fonts referenced by the UI.

## Notes
- Toolchain avoids esbuild/swc/native binaries; all transforms are JavaScript-only.
- Jest uses `babel-jest` with happy-dom; no ts-jest/extensions.
- For production, `rollup` outputs an ESM bundle under `apps/ui-archos/dist`.
