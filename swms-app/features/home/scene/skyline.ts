// ─────────────────────────────────────────────────────────────
// Data · Home › Park scene skyline
// Fixed building positions and the ground line of the SVG scene.
// Used by: scene/HeroScene.tsx, scene/parts/Tower.tsx
// ─────────────────────────────────────────────────────────────

export type Building = { x: number; w: number; h: number; tone: number; spire?: boolean };

// Deterministic layouts (no randomness → identical on server and client).
export const FAR: Building[] = [
  [20, 60, 170], [90, 46, 230], [150, 70, 150], [235, 52, 260], [300, 64, 190],
  [380, 44, 300, 1], [440, 70, 170], [525, 50, 220], [590, 62, 160], [665, 48, 250],
  [725, 66, 180], [805, 52, 290, 1], [870, 70, 160], [955, 46, 230], [1015, 64, 200],
  [1095, 50, 270], [1160, 72, 170], [1245, 48, 240, 1], [1305, 66, 190], [1385, 60, 220],
].map(([x, w, h, spire]) => ({ x, w, h, tone: 0, spire: Boolean(spire) }));

export const NEAR: Building[] = [
  [40, 74, 210], [128, 58, 150], [196, 80, 260], [290, 60, 180], [365, 70, 130],
  [980, 66, 140], [1060, 84, 250], [1158, 60, 170], [1232, 78, 230], [1324, 64, 160],
].map(([x, w, h]) => ({ x, w, h, tone: 1 }));

export const GROUND = 470;
