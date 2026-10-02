# Bathroom tile planner — instructions for Claude Code

You maintain and extend a browser app for planning the tiles of two real bathrooms. "Current state" and "Open points" below hold where things stand. Talk to the owner (Boyko) in plain language, confirm anything ambiguous before building it, and keep changes small and discrete — he works in specific, one-feature-at-a-time requests.

## Current state (2026-10-02)

- Two bathrooms as tabs, sharing one tile library of four real products from praktiker.bg (Cersanit): Wall main (Dekorina Turquoise 29.7 × 60), Wall decor (Dekorina White Matt decor 29.7 × 60, sold per piece), Floor (G1807 Cream 18.5 × 59.8, wood look), Floor decor (Patchwork Multicolor 59.8 × 59.8). Prices checked 2026-10-01.
- Default combination in both bathrooms: **Wall main + Floor decor**. Four more per bathroom: Decor behind sink / Decor back wall, each with Floor or Floor decor.
- Bathroom 2 shower: folding glass wall is the selected variant; walk-in fixed glass is available with four lengths (entry 40/50/60/70 cm).
- Features: 3D view (Overview default, Doorway, Sink, From shower; door and shower door animations), ceiling height per bathroom, surfaces with tile/paint split heights, tiles to order with boxes and €, combined order for both bathrooms, JSON download/upload, Export to Blender, tile photos with mirror/rotate variations.
- Live on GitHub Pages (see "Deployment"). The claude.ai copy was last republished 2026-10-02 and is behind.

## Open points

- Bathroom 2 walk-in entry is only 40 cm with the 78 cm glass; the owner has not chosen a length yet.
- Bathroom 1: the Floor tile is R9 (dry areas); worth checking before using it inside the shower.
- Folding glass wall sizes are estimated (2 × 58 cm); match them to the real Armonia Duo Nero product sheet when available.
- Keep or retire the claude.ai copy now that GitHub Pages is live.
- Mobile performance: shadows are now updated only when they change and touch screens get lighter rendering; if it still lags on phones, next steps are cheaper shadow filtering (`PCFShadowMap`, 256 px maps) and fewer shadow-casting spots on touch screens.
- Possible: more rooms later (the repo is named `home-planner` for that reason).
- No automated tests. A good first refactor: move `computeQty`, `forCells` and the room definitions into modules with unit tests.

## Run and check

```
npm install
npm run dev            # http://localhost:5173, reloads on save
npm run check          # syntax check + production build; run before saying a change is done
npm run build:single   # dist-single/index.html — one self-contained page for sharing or republishing
```

There are no automated tests yet. After a change, open the dev server and verify by hand: both bathroom tabs, the four viewpoints, the change itself, the "Tiles to order" numbers, and JSON download/upload if the data model was touched.

## Files

| Path | What it is |
|---|---|
| `index.html` | Page layout and the side panel markup |
| `src/main.js` | Everything else (one file, sectioned by `/* ---- name ---- */` banners, see below) |
| `src/style.css` | Styling; colour tokens on `:root`, dark mode via `prefers-color-scheme` |
| `src/embedded-textures.js` | Base64 product photos used when a texture file is missing. ~0.5 MB of generated data: **never read or edit it**; to change a photo, put a file in `public/textures/` |
| `public/textures/` | Tile photos (`wall-main.jpg`, `wall-decor.jpg`, `floor.jpg`, `floor-decor.jpg`), one cropped tile face each, seen straight on. `<name>-2.jpg`, `-3` … add face variations |

### Sections of `src/main.js`

`bathrooms` (room definitions: `ROOMS.b1`, `ROOMS.b2`) · `state` (defaults, shop tiles, combinations, migrations) · `image store` (IndexedDB for uploaded photos) · `helpers` · `tile faces` (procedural previews, photo variations) · `quantities` (`computeQty`) · `three.js scene` (`buildRoom`: lights, surfaces, fixtures, door) · `textures` (draws each surface's tiles onto a canvas) · `camera & controls` · `highlight` · `combination files` (JSON import/export, Export to Blender, zip writer) · `panel UI` · `start`.

## Domain rules (do not change without asking)

- **Wall names**: Entrance, Left, Right, Back. Standing in the door looking in, Left is on your left. Coordinates in cm: x from the Left wall (0) to the Right wall (W), z from the Back wall (0) to the Entrance wall (D), y up.
- **Bathroom 1**: 267 × 156 cm. Door 10 cm from the Left wall, hinged on that side, opens inward. Walk-in shower along the whole Right wall (87 cm wide, floor to the Entrance wall), one 78 cm fixed glass wall. Toilet box 90 × 12 cm, floor to ceiling. Radiator on the Left wall behind the door.
- **Bathroom 2**: 310 × 145 cm. Door 15 cm from the Right wall, hinged on that side. Back wall left to right: ventilation box 24 × 26 cm (floor to ceiling) + 90 cm shower pipe wall; toilet pipe box 86 × 27 cm (floor to ceiling) with a 20 cm deep, 90 cm high toilet box in front; 110 cm sink wall. Shower along the Left wall, 114 cm wide, to the Entrance wall. Shower variants: walk-in fixed glass (cut around the toilet box, fixed to both boxes; lengths 78/68/58/48 cm above the toilet box, 20 cm less below) or a full-length two-panel folding glass wall (Armonia Duo Nero style: black profiles, no rail, hinged on the Entrance wall, folds into the shower). Radiator on the Entrance wall left of the door.
- Both: six recessed ceiling spots in 2 rows × 3 columns, evenly spaced. Ceiling height per bathroom (presets 260/270/280, free input 150–400).
- **Tile names** are fixed: Wall main, Wall decor, Floor, Floor decor. Tile library is shared by both bathrooms.
- **Order quantities** = tiled area × (1 + waste %), rounded up to whole tiles, then boxes. "Pieces" (every cut piece as a whole tile) is shown only as the worst case. Do not go back to a worst-case formula.
- **Both bathrooms together** uses each tab's selected combination and pools area before rounding.
- **JSON combination files**: file name = combination name and vice versa. Format `bathroom-tile-planner.combination` version 1; the file records `room.id` so it loads into the right bathroom. Keep old files loadable.
- **Export to Blender** saves `<Bathroom> - <combination>.zip` containing the `.glb` (metres, named objects `B1_…`/`B2_…`, tile textures, planner data as a JSON string in the root node's custom property `planner`) and the combination `.json`.

## Conventions

- Saved state lives in `localStorage` (`bathroom-tile-planner.v1`) with a version number `state.v`. **Any change to the saved data shape needs a new migration step** in the `state` section (bump `v`, convert old data, never drop the owner's combinations or uploaded photos).
- Adding a bathroom: add an entry to `ROOMS` (sections, `surfaces()`, `fixtures(F)`, `views`, `info()`, `assumptions()`), add it to `ROOM_ORDER`, give it default combinations, and add a migration that creates its room state.
- Surfaces are unions of rectangles in a local (u, v) frame; quantities and textures both come from the same rects, so geometry and counts can't drift apart.
- Name new 3D objects through `F.label('Name')` before creating them so the Blender export stays readable.
- three.js is pinned to **0.128.0** (r128). Don't upgrade casually: lighting, colour management and the exporter API change between versions.
- Prices come from the product pages linked in each tile (praktiker.bg). To refresh prices, fetch the page, update `price` and `priceCheckedAt`, and tell the owner what changed. The shop's image server can't be reached from Claude's sandbox, so tile photos are downloaded by the owner and put in `public/textures/`.
- Shadows are not redrawn every frame (`renderer.shadowMap.autoUpdate=false`, for phones). Anything that moves or changes a shadow-casting object must set `renderer.shadowMap.needsUpdate=true` (as `buildRoom`, the door and the shower glass do).
- No third-party requests from the page: no CDNs, analytics or web fonts from other hosts. The font is self-hosted (`@fontsource-variable/instrument-sans`); outside links need `rel="noopener noreferrer nofollow"`. The page is `noindex` and has `referrer: no-referrer` (see `index.html`).
- Keep UI text plain and short; no jargon in labels.

## Deployment

- **GitHub Pages (live)**: https://boykoivanov.github.io/home-planner/, public repo `boykoivanov/home-planner` (Boyko's personal GitHub account). Every push to `main` runs `.github/workflows/pages.yml` (`npm ci`, `npm run check`, deploy `dist`), so run `npm run check` before pushing. `vite.config.js` uses a relative `base: './'` so it works under `/home-planner/`. DEPLOY.md has the Vercel comparison.
- **Git identity**: the machine's default is the work account. This repo is wired to the personal one: remote `git@github-personal:boykoivanov/home-planner.git` (SSH host alias with its own key) and commits as `boykoivanov@duck.com` (GitHub blocks pushes that expose the private gmail). `git personal` / `git work` / `git whoami` are global aliases that set the identity in the current repo. Don't use `gh auth login` for the personal account; it would change the active `gh` account for every session.
- **claude.ai copy**: a published copy also exists on claude.ai that you cannot update from here. REPUBLISH_ARTIFACT.md explains the flow and when to remind Boyko about it.
- Saved combinations and photos belong to each address separately (localhost, GitHub Pages, claude.ai). Move them with Download / Upload JSON.

## Before you finish a session

Update "Current state" and "Open points" above if they changed (git history is the log). If the planner changed visibly, remind Boyko that the claude.ai copy is out of date (see REPUBLISH_ARTIFACT.md). Never `git push` without confirming remote and branch with Boyko first.

## Commit messages

Conventional Commits, enforced by `commitlint` through the husky `commit-msg` hook (same rules as hubflow-react): `type(scope): subject`, types `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`; lines up to 180 characters.
