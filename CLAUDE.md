# Bathroom tile planner — instructions for Claude Code

You maintain and extend a browser app for planning the tiles of two real bathrooms. Read @HISTORY.md first: it holds the decisions made so far and the current state. Talk to the owner (Boyko) in plain language, confirm anything ambiguous before building it, and keep changes small and discrete — he works in specific, one-feature-at-a-time requests.

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
- Prices come from the product pages linked in each tile (praktiker.bg). To refresh prices, fetch the page, update `price` and `priceCheckedAt`, and tell the owner what changed.
- Keep UI text plain and short; no jargon in labels.

## The published version

There is also a published copy of the planner on claude.ai that you cannot update from here. REPUBLISH_ARTIFACT.md explains the flow and when to remind Boyko about it; follow it at the end of any session with visible changes to the planner.

## Before you finish a session

Update HISTORY.md: rewrite "Current state" if it changed, and add a dated entry to the log (what was asked, what changed, anything left open). Keep entries to a few lines. If the planner changed visibly, remind Boyko that the published copy is out of date (see REPUBLISH_ARTIFACT.md).

## Commit messages

Conventional Commits, enforced by `commitlint` through the husky `commit-msg` hook (same rules as hubflow-react): `type(scope): subject`, types `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`; lines up to 180 characters. Pushing `main` deploys to GitHub Pages (see DEPLOY.md), so run `npm run check` first.
