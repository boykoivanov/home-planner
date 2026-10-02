# Republishing the planner on claude.ai

The planner exists in two places:

- **Local project**: this folder. Claude Code works here, and `npm run dev` shows it at http://localhost:5173.
- **Published copy**: https://claude.ai/artifact/KypxhLAGP3Rej1Uz18jt24, the link Boyko opens on claude.ai and shares with people who have a Claude account. Only Claude in a claude.ai chat can update it; Claude Code can't.

After changes here, the published copy stays at its old version until it is republished.

## When to remind Boyko

At the end of a session in which the planner changed in a way he can see (layout, tiles, prices, panel, 3D view, exports), remind him that the published copy is now out of date and offer to prepare the file. Don't remind him after sessions that only touched notes or code structure with no visible change. If he says he no longer uses the published copy, stop reminding him and note that in the CLAUDE.md "Current state".

## Steps

1. **Build the single file** (Claude Code can do this):
   ```
   npm run check
   npm run build:single
   ```
   The result is `dist-single/index.html`: one self-contained page (about 1.2 MB) with three.js, styles and the built-in tile photos inlined.
2. **Open a chat on claude.ai** (ideally in the same project as the planner) and attach `dist-single/index.html`.
3. **Ask Claude to republish it at the existing link**, for example:
   > Please republish this file as the Bathroom tile planner artifact at https://claude.ai/artifact/KypxhLAGP3Rej1Uz18jt24, keeping the downloads capability.
4. **Check the link**: open it, switch between both bathroom tabs, and try Download JSON once so the save dialog still works.
5. **Record it** in the CLAUDE.md "Current state": date and that the claude.ai copy is in sync again.

## Notes

- Republishing at the same link keeps it the same for everyone it was shared with.
- Combinations and photos saved in the browser belong to each address separately. What's saved on localhost doesn't appear on the claude.ai link, and the other way round. To move a combination, use Download JSON on one and Upload JSON on the other.
- To share with someone who has no Claude account, send them `dist-single/index.html` or put it on a free static host; the claude.ai link needs an account.
