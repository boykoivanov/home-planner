# Deploying the planner (plan)

Status: done. Live at https://boykoivanov.github.io/home-planner/ (GitHub Pages, public repo boykoivanov/home-planner, deployed by .github/workflows/pages.yml on push to main). The text below is the original plan.

The planner is a static site: `npm run build` makes `dist/`, no server code, no database. Any free static host works. Saved combinations and photos live in each visitor's browser (`localStorage` / IndexedDB), so nothing needs a backend.

## Options

| | Vercel (Hobby) | GitHub Pages |
|---|---|---|
| Cost | Free | Free |
| Private repo | Yes | No (needs paid plan); free means public repo |
| URL | `<name>.vercel.app` | `<user>.github.io/<repo>/` |
| Config needed | None (Vite auto-detected) | Set `base: '/<repo>/'` in `vite.config.js` + a GitHub Actions workflow |
| Deploy on push | Built in | Via the workflow |
| Preview per branch | Yes | No |
| Terms | Personal, non-commercial use | Fine for this |

**Recommendation: Vercel.** Less setup, works with a private repo, no `base` path change. Use GitHub Pages only if the repo being public is fine and you want everything on GitHub.

## Steps (Vercel)

1. Put the project in git (it is not a repo yet): `git init`, commit. Check `.gitignore` has `node_modules`, `dist`, `dist-single`.
2. Create a GitHub repo and push. Needs your OK on the remote and branch at push time.
3. vercel.com, sign in with GitHub, "Add New Project", import the repo.
4. Settings: Framework Vite, build `npm run build`, output `dist`. These are the defaults.
5. Deploy. Every push to `main` redeploys.
6. Check the live URL (same checks as CLAUDE.md: both tabs, four viewpoints, Tiles to order, JSON download/upload, Export to Blender).

## Steps (GitHub Pages, alternative)

1. Same steps 1-2 above; repo must be public.
2. `vite.config.js`: add `base: '/<repo>/'` for the normal build (keep the `single` mode untouched).
3. Add `.github/workflows/pages.yml`: checkout, setup-node, `npm ci`, `npm run build`, upload `dist` with `actions/upload-pages-artifact`, deploy with `actions/deploy-pages`.
4. Repo Settings, Pages, Source: GitHub Actions.
5. Check `https://<user>.github.io/<repo>/`. Texture paths in `public/textures/` must still load under the sub-path.

## Things to know

- New address means new browser storage: combinations saved on localhost or the claude.ai link do not appear there. Move them with Download JSON / Upload JSON.
- The claude.ai published copy stays separate. Decide whether to keep it or retire it; if retired, update REPUBLISH_ARTIFACT.md and CLAUDE.md.
- Bundle is about 1.2 MB with embedded photos, fine for free tiers.
- Repo contains `src/embedded-textures.js` (~0.5 MB generated); fine to commit.
- No tests yet, so the only gate is `npm run check`. Could run it in CI later.

## Open questions for Boyko

1. OK with a public repo? (Decides Pages vs Vercel.)
2. Want a custom domain later? Both support it.
3. Keep or retire the claude.ai copy?
