export const getUnitNumberFromId = (unitId: string): number | null => {
  const match = unitId.match(/^unit_(\d+)$/i);
  if (match) return parseInt(match[1], 10);
  return null;
};
