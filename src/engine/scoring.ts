/** Exact: 20 plus 10 per trick. Otherwise minus 10 per trick off. */
export function roundScore(bid: number, tricks: number): number {
  return bid === tricks ? 20 + 10 * tricks : -10 * Math.abs(bid - tricks)
}
