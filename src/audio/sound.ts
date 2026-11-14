import { getSettings } from '../settings/clientSettings'

/** Tiny synthesised cues (no sound files): soft glassy tones that fit the night-sky table. */
export type Cue = 'card' | 'trick' | 'turn' | 'round' | 'win' | 'miss'

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (!getSettings().sound) return null
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(ac: AudioContext, freq: number, start: number, length: number, gain: number, type: OscillatorType = 'sine'): void {
  const osc = ac.createOscillator()
  const amp = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t = ac.currentTime + start
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(gain, t + 0.01)
  amp.gain.exponentialRampToValueAtTime(0.0001, t + length)
  osc.connect(amp).connect(ac.destination)
  osc.start(t)
  osc.stop(t + length + 0.05)
}

export function play(cue: Cue): void {
  const ac = audio()
  if (!ac) return
  switch (cue) {
    case 'card':
      tone(ac, 1320, 0, 0.08, 0.04, 'triangle')
      break
    case 'trick':
      tone(ac, 880, 0, 0.5, 0.05)
      tone(ac, 1318.5, 0.06, 0.6, 0.04)
      break
    case 'turn':
      tone(ac, 659.3, 0, 0.35, 0.06)
      tone(ac, 987.8, 0.12, 0.5, 0.05)
      break
    case 'round':
      ;[523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(ac, f, i * 0.09, 0.7, 0.04))
      break
    case 'win':
      ;[523.3, 659.3, 784, 1046.5, 1318.5, 1568].forEach((f, i) => tone(ac, f, i * 0.11, 1.1, 0.045))
      break
    case 'miss':
      tone(ac, 330, 0, 0.5, 0.05, 'triangle')
      tone(ac, 311.1, 0.15, 0.6, 0.04, 'triangle')
      break
  }
}
