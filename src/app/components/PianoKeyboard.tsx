import { useState } from 'react'

const WK_W = 40
const WK_H = 160
const BK_W = 24
const BK_H = 100
const START_MIDI = 36 // C2
const END_MIDI = 84   // C6
const BLACK_SEMITONES = new Set([1, 3, 6, 8, 10])

interface KeyDef {
  midiNote: number
  type: 'white' | 'black'
  whiteIndex?: number
  afterWhiteIndex?: number
}

function buildKeys(): KeyDef[] {
  const keys: KeyDef[] = []
  let whiteCount = 0
  for (let midi = START_MIDI; midi <= END_MIDI; midi++) {
    const isBlack = BLACK_SEMITONES.has(midi % 12)
    if (!isBlack) {
      keys.push({ midiNote: midi, type: 'white', whiteIndex: whiteCount })
      whiteCount++
    } else {
      keys.push({ midiNote: midi, type: 'black', afterWhiteIndex: whiteCount - 1 })
    }
  }
  return keys
}

const ALL_KEYS = buildKeys()
const WHITE_KEYS = ALL_KEYS.filter(k => k.type === 'white')
const BLACK_KEYS = ALL_KEYS.filter(k => k.type === 'black')
const TOTAL_WIDTH = WHITE_KEYS.length * WK_W

const C = {
  white:        '#f2f5f9',
  black:        '#2e3a48',
  whiteBorder:  'transparent',
  whitePressed: '#c8d8e8',
  blackPressed: '#2a5a8a',
  whiteGuide:   '#cddfc8',
  blackGuide:   '#3a7a50',
  whiteHover:   '#dce4f0',
  blackHover:   '#3a4858',
  label:        '#7a90b0',
} as const

const NM = {
  white:   '2px 4px 6px rgba(100,130,170,0.45), -2px -2px 5px rgba(255,255,255,0.85)',
  black:   '2px 4px 6px rgba(20,30,50,0.6), -1px -1px 3px rgba(80,100,130,0.3)',
  pressed: 'inset 2px 3px 6px rgba(100,130,170,0.5), inset -2px -2px 5px rgba(255,255,255,0.6)',
  bkPressed: 'inset 2px 3px 5px rgba(0,0,0,0.5), inset -1px -1px 3px rgba(80,100,130,0.2)',
  wGuide:  '2px 4px 6px rgba(80,120,80,0.35), -2px -2px 5px rgba(220,240,215,0.8)',
  bGuide:  '2px 4px 6px rgba(20,60,30,0.5), -1px -1px 3px rgba(80,140,90,0.3)',
} as const

interface PianoKeyboardProps {
  pressedKeys?: number[]
  guideKeys?: number[]
  onKeyDown?: (midiNote: number) => void
  onKeyUp?: (midiNote: number) => void
}

export function PianoKeyboard({
  pressedKeys = [],
  guideKeys = [],
  onKeyDown,
  onKeyUp,
}: PianoKeyboardProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const pressed = new Set(pressedKeys)
  const guide   = new Set(guideKeys)

  function wColor(midi: number) {
    if (pressed.has(midi)) return C.whitePressed
    if (guide.has(midi))   return C.whiteGuide
    if (hovered === midi)  return C.whiteHover
    return C.white
  }
  function wShadow(midi: number) {
    if (pressed.has(midi)) return NM.pressed
    if (guide.has(midi))   return NM.wGuide
    return NM.white
  }
  function bColor(midi: number) {
    if (pressed.has(midi)) return C.blackPressed
    if (guide.has(midi))   return C.blackGuide
    if (hovered === midi)  return C.blackHover
    return C.black
  }
  function bShadow(midi: number) {
    if (pressed.has(midi)) return NM.bkPressed
    if (guide.has(midi))   return NM.bGuide
    return NM.black
  }

  return (
    <div>
      <p style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, fontWeight: 500 }}>
        Piano · C2 – C6
      </p>
      <div style={{ position: 'relative', width: TOTAL_WIDTH, height: WK_H, userSelect: 'none' }}>
        {/* White keys */}
        {WHITE_KEYS.map(k => {
          const isC = k.midiNote % 12 === 0
          const octave = Math.floor(k.midiNote / 12) - 1
          return (
            <div
              key={k.midiNote}
              onMouseEnter={() => setHovered(k.midiNote)}
              onMouseLeave={() => setHovered(null)}
              onMouseDown={() => onKeyDown?.(k.midiNote)}
              onMouseUp={() => onKeyUp?.(k.midiNote)}
              style={{
                position:       'absolute',
                left:           k.whiteIndex! * WK_W,
                top:            0,
                width:          WK_W - 3,
                height:         WK_H,
                background:     wColor(k.midiNote),
                border:         'none',
                borderRadius:   '6px',
                cursor:         'pointer',
                display:        'flex',
                alignItems:     'flex-end',
                justifyContent: 'center',
                paddingBottom:  7,
                fontSize:       10,
                fontWeight:     500,
                color:          C.label,
                boxShadow:      wShadow(k.midiNote),
                transition:     'background 0.15s, box-shadow 0.15s',
                boxSizing:      'border-box',
              }}
            >
              {isC ? `C${octave}` : ''}
            </div>
          )
        })}

        {/* Black keys */}
        {BLACK_KEYS.map(k => {
          const x = (k.afterWhiteIndex! + 1) * WK_W - BK_W / 2
          return (
            <div
              key={k.midiNote}
              onMouseEnter={() => setHovered(k.midiNote)}
              onMouseLeave={() => setHovered(null)}
              onMouseDown={() => onKeyDown?.(k.midiNote)}
              onMouseUp={() => onKeyUp?.(k.midiNote)}
              style={{
                position:   'absolute',
                left:       x,
                top:        0,
                width:      BK_W,
                height:     BK_H,
                background:   bColor(k.midiNote),
                borderRadius: '5px',
                cursor:       'pointer',
                zIndex:       1,
                boxShadow:    bShadow(k.midiNote),
                transition:   'background 0.15s, box-shadow 0.15s',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
