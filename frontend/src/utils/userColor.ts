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

const computePaletteIndex = (userId: number): number => {
  const positiveId = Math.abs(userId);
  return positiveId % COLOR_PALETTE.length;
};

export const userColor = (userId: number): string => {
  const index = computePaletteIndex(userId);
  return COLOR_PALETTE[index];
};
