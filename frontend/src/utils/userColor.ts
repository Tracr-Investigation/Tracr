const COLOR_PALETTE: readonly string[] = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

// Hash stable (djb2) de l'UUID : un meme utilisateur garde toujours la meme couleur.
const computePaletteIndex = (userId: string): number => {
  let hash = 5381;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) + hash + userId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % COLOR_PALETTE.length;
};

export const userColor = (userId: string): string => {
  const index = computePaletteIndex(userId);
  return COLOR_PALETTE[index];
};
