/** SVG path data for the card glyphs, in a 20×20 box centred on 0,0. */

function starPath(points: number, outer: number, inner: number, rotate = -90): string {
  let d = ''
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer
    const a = ((rotate + (i * 180) / points) * Math.PI) / 180
    d += `${i ? 'L' : 'M'}${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`
  }
  return d + 'Z'
}

export const SUN_RAYS = (() => {
  let d = ''
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    const tip = [9.4 * Math.cos(a), 9.4 * Math.sin(a)]
    const l = [6.1 * Math.cos(a - 0.26), 6.1 * Math.sin(a - 0.26)]
    const r = [6.1 * Math.cos(a + 0.26), 6.1 * Math.sin(a + 0.26)]
    d += `M${l[0].toFixed(2)} ${l[1].toFixed(2)}L${tip[0].toFixed(2)} ${tip[1].toFixed(2)}L${r[0].toFixed(2)} ${r[1].toFixed(2)}Z`
  }
  return d
})()

export const STAR = starPath(5, 9.2, 3.9)
export const SPARKLE = starPath(4, 10, 2.6)
export const BURST = starPath(8, 9.8, 4.6, -90)
