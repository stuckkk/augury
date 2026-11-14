/** mulberry32: small, fast, good enough for shuffling cards. Returns [value in [0,1), next state]. */
export function nextRandom(state: number): [number, number] {
  const s = (state + 0x6d2b79f5) | 0
  let t = s
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s]
}

/** Fisher–Yates with the seeded generator; returns the shuffled copy and the new RNG state. */
export function shuffle<T>(items: readonly T[], state: number): [T[], number] {
  const out = [...items]
  let s = state
  for (let i = out.length - 1; i > 0; i--) {
    let r: number
    ;[r, s] = nextRandom(s)
    const j = Math.floor(r * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return [out, s]
}
