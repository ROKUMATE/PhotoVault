export const ACCOUNT_COLORS = [
  "#4285F4",
  "#EA4335",
  "#34A853",
  "#FBBC04",
  "#9334E6",
  "#00BCD4",
  "#FF6D00",
  "#F06292",
] as const;

export function getAccountColor(index: number): string {
  return ACCOUNT_COLORS[index % ACCOUNT_COLORS.length];
}
