export function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function scoreColor(score: number): string {
  if (score >= 0.8) return "text-green-500";
  if (score >= 0.6) return "text-yellow-500";
  return "text-red-500";
}
