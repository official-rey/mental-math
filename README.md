# Mental Math

A mental-arithmetic trainer: learn a technique from one card (idea, worked example, picture), then drill it. Static site, Vite + vanilla TypeScript, no backend.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest: generators, chain evaluator, drill engine, storage
npm run e2e        # Playwright: builds, serves on :4173, runs the smoke and share tests
```

First Playwright run needs a browser: `npx playwright install chromium`.

## Deploy

`npm run build` writes a static site to `dist/`. Asset paths are relative and routing uses the URL hash, so `dist/` works from any sub-path.

- **Netlify:** build command `npm run build`, publish directory `dist`.
- **GitHub Pages:** push `dist/` to a `gh-pages` branch (for example `npx gh-pages -d dist`), or use the Pages "GitHub Actions" source with a workflow that runs `npm ci && npm run build` and uploads `dist`.

## Add a technique

Create one file, `src/techniques/catalog/<id>.ts`, that default-exports `defineTechnique({...})`. The registry picks it up automatically. Copy `mul-2x1.ts` as a starting point. A technique provides:

- `meta`: id (same as the file name), name, category, tier, sort order, one-line idea.
- `card`: up to three short lines of prose, an `example` problem, a `graphic()` returning inline SVG built from `src/techniques/svg.ts` (theme classes only, no hard-coded colors), and a caption.
- `levels`: a label and inclusive bounds for each value in `Problem.data`, for levels 1–3.
- `generate(rng, level)`: returns a `Problem` with the display text, the answer as a plain number string, and its data.
- `steps(problem)`: the worked solution for that exact problem, one operation per line. The last line must be the answer.
- Optional `reference(problem)` for problems whose text is not an arithmetic expression, and `tolerance` on problems that accept estimates.

`npm test` then checks the new technique automatically: 500 samples per level must stay inside the bounds, match an independent evaluation, and end their steps on the answer. The card must have an example and a graphic.

## Layout

```
src/techniques/   registry, types, SVG kit, one module per technique in catalog/
src/chain/        expression parser/evaluator/printer and the chain generator
src/drill/        drill engine, sounds, drill specs
src/storage/      Store interface + localStorage implementation (swap for a backend later)
src/share/        score card PNG, GIF replay, Web Share / download
src/ui/           screens (home, card, drill, results, mixed, chain, about)
src/art/          background curves
```
