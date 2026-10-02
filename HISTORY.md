# History

## Current state (2026-10-02)

- Two bathrooms as tabs, sharing one tile library with four real products from praktiker.bg (Cersanit): Wall main (Dekorina Turquoise 29.7 × 60), Wall decor (Dekorina White Matt decor 29.7 × 60, sold per piece), Floor (G1807 Cream 18.5 × 59.8, wood look), Floor decor (Patchwork Multicolor 59.8 × 59.8). Prices checked 2026-10-01.
- Default combination in both bathrooms: **Wall main + Floor decor**. Four more per bathroom: Decor behind sink / Decor back wall, each with Floor or Floor decor.
- Bathroom 2 shower: folding glass wall selected; walk-in fixed glass available with four lengths (entry 40/50/60/70 cm).
- Features: 3D view (Overview default, Doorway, Sink, From shower; door and shower door animations), ceiling height per bathroom, surfaces with tile/paint split heights, tiles to order with boxes and €, combined order for both bathrooms, JSON download/upload, Export to Blender (.zip with .glb + .json), tile photos with mirror/rotate variations.
- Published copy on claude.ai is in sync with this project as of this date.

## Open points

- Bathroom 2 walk-in entry is only 40 cm with the 78 cm glass; the owner has not chosen a length yet.
- Bathroom 1: the Floor tile is R9 (dry areas); worth checking before using it inside the shower.
- Folding glass wall sizes are estimated (2 × 58 cm); match them to the real Armonia Duo Nero product sheet when available.
- No automated tests. A good first refactor: move `computeQty`, `forCells` and the room definitions into modules with unit tests.

## Log

- **2026-10-01** Built the three.js planner for Bathroom 1 (267 × 156, 280 cm), split into this Vite project. Toilet box made floor to ceiling. Added the four shop tiles and their cropped photos (the shop's image server can't be reached from Claude's sandbox, so photos were downloaded by the owner). Switched ordering from worst case to area + waste. Overview became the default view. Shower: single fixed glass, no door; shower floor extended to the Entrance wall. Six ceiling spots. Ceiling height control (260/270/280 + free input). JSON download/upload with full tile data and photos.
- **2026-10-02** Added Bathroom 2 (310 × 145) with ventilation box, pipe box and 90 cm toilet box; tabs per bathroom and a combined order. Default combination Wall main + Floor decor. Bathroom 2 shower variants: sliding door → folding door → full-length folding glass wall hinged at the Entrance wall (Armonia Duo Nero style); walk-in glass cut around the toilet box with selectable length. Shower glass 10% darker. Added Export to Blender, the single-file build and these handoff notes.
