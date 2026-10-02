# Bathroom tile planner

Interactive 3D planner (three.js r128) for two bathrooms: compare tile combinations, see quantities and cost, export combinations as JSON and rooms to Blender.

## Run locally

Requires Node.js 18 or newer.

    npm install
    npm run dev            # http://localhost:5173
    npm run check          # syntax check + build
    npm run build:single   # dist-single/index.html, one self-contained page

## Files

- index.html                 page layout and side panel
- src/main.js                bathrooms, tiles, quantities, 3D scene, import/export
- src/style.css              styling
- src/embedded-textures.js   built-in product photos (generated data)
- public/textures/           tile photos; see public/textures/README.md
- CLAUDE.md                  instructions and current state for Claude Code
- DEPLOY.md                  hosting notes (GitHub Pages)

Combinations and uploaded tile photos are saved in the browser (localStorage and IndexedDB) for this address only.
