// chord-trainer synth.ts ベース + キー長押しで伸ばす (ADSR 対応)

let _ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!_ctx) _ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  if (_ctx.state === 'suspended') void _ctx.resume()
  return _ctx
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

interface ActiveNote {
  oscs: OscillatorNode[]
  gain: GainNode
  gain2: GainNode
}

class AudioEngine {
  private activeNotes: Map<number, ActiveNote> = new Map()
  private stopTimeouts: ReturnType<typeof setTimeout>[] = []

  playNote(midiNote: number, velocity: number = 100): void {
    const ac   = getCtx()
    const freq = midiToFreq(midiNote)
    const t    = ac.currentTime
    const vel  = (velocity / 127) * 0.9

    this.stopNote(midiNote)

    // ─ 基音（triangle）
    const osc  = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'triangle'
    osc.frequency.value = freq

    // Attack → Decay → Sustain（キーを離すまで伸ばす）
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(vel * 0.55, t + 0.007)  // Attack
    gain.gain.exponentialRampToValueAtTime(vel * 0.22, t + 0.35) // Decay
    // Sustain: vel*0.22 で保持（scheduleしない → stopNote で Release）

    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start(t)

    // ─ 2倍音（sine）— 輝き感、短めで自然に消える
    const osc2  = ac.createOscillator()
    const gain2 = ac.createGain()
    osc2.type = 'sine'
    osc2.frequency.value = freq * 2
    gain2.gain.setValueAtTime(0, t)
    gain2.gain.linearRampToValueAtTime(vel * 0.09, t + 0.005)
    gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.7)
    osc2.connect(gain2)
    gain2.connect(ac.destination)
    osc2.start(t)
    osc2.stop(t + 0.8)

    this.activeNotes.set(midiNote, { oscs: [osc, osc2], gain, gain2 })
  }

  stopNote(midiNote: number): void {
    const note = this.activeNotes.get(midiNote)
    if (!note) return
    const ac  = getCtx()
    const now = ac.currentTime
    const rel = 0.15 // Release 150ms

    note.gain.gain.cancelScheduledValues(now)
    note.gain.gain.setValueAtTime(note.gain.gain.value, now)
    note.gain.gain.exponentialRampToValueAtTime(0.0001, now + rel)

    note.gain2.gain.cancelScheduledValues(now)
    note.gain2.gain.setValueAtTime(Math.max(note.gain2.gain.value, 0.0001), now)
    note.gain2.gain.exponentialRampToValueAtTime(0.0001, now + rel)

    note.oscs.forEach(osc => {
      try { osc.stop(now + rel) } catch {}
    })
    this.activeNotes.delete(midiNote)
  }

  // MidiLoadTab用: durationMs の間鳴らしてから Release
  playChord(midiNotes: number[], durationMs: number = 800, velocity: number = 100): void {
    midiNotes.forEach(note => this.playNote(note, velocity))
    const t = setTimeout(() => {
      midiNotes.forEach(note => this.stopNote(note))
    }, durationMs)
    this.stopTimeouts.push(t)
  }

  stopAll(): void {
    this.stopTimeouts.forEach(t => clearTimeout(t))
    this.stopTimeouts = []
    const ac  = getCtx()
    const now = ac.currentTime
    this.activeNotes.forEach(note => {
      note.gain.gain.cancelScheduledValues(now)
      note.gain.gain.setValueAtTime(0, now)
      note.gain2.gain.cancelScheduledValues(now)
      note.gain2.gain.setValueAtTime(0, now)
      note.oscs.forEach(osc => { try { osc.stop(now) } catch {} })
    })
    this.activeNotes.clear()
  }
}

export const audioEngine = new AudioEngine()
