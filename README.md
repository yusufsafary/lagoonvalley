# 🌴 Lagoon Valley

A mobile-first 3D farming game built with Three.js and Vite.

**Play it:** https://yusufsafary.github.io/lagoonvalley/

## Controls
- **Virtual joystick** (bottom-left) — move your character
- **Action button** (bottom-right) — till / plant / water / harvest / talk
- **Inventory bar** (bottom) — select seeds to plant
- **Shop button** (top-right) — buy seeds, sell crops

## Gameplay
1. Walk up to a farm plot and tap the action button to **till** the soil
2. Select a seed from your inventory, then tap the plot to **plant**
3. Return and tap again to **water** — crops only grow when watered!
4. When fully grown (stage 4), tap to **harvest**
5. Sell your harvest at the **Lagoon Market** to earn gold
6. Watch the **tide** — coastal plots flood at high tide!

## Tech Stack
- [Three.js](https://threejs.org/) — 3D rendering
- [Vite](https://vitejs.dev/) — build tool
- Deployed via GitHub Pages + GitHub Actions

## Dev
```bash
npm install
npm run dev
```

## Extending
- Add new crops in `src/store/gameState.js` under `CROPS`
- Add NPCs in `src/components/NPC.js`
- Swap primitive meshes for `.glb` models without touching game logic
