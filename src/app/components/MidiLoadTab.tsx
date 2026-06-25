import { useState, useEffect, useRef, useCallback } from "react"
import { Midi } from "@tonejs/midi"
import { Music2, Play, Square, Pause, Lightbulb, Repeat, Volume2 } from "lucide-react"
import { chordNameToNotes } from "@/app/utils/chord-detector"
import { audioEngine } from "@/app/utils/audio-engine"
import { parseMidiToChordProgression, type ChordProgressionItem } from "@/app/components/MidiFileAnalyzer"
import { Switch } from "@/app/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"
import { Label } from "@/app/components/ui/label"

const DEFAULT_BPM = 120
const BPM_MIN = 40
const BPM_MAX = 240
const SPEED_OPTIONS = [1, 0.75, 0.5, 0.25] as const
const KEYBOARD_MIDI_MIN = 36
const KEYBOARD_MIDI_MAX = 84

interface MidiLoadTabProps {
  guideEnabled: boolean
  setGuideEnabled: (v: boolean) => void
  setGuideKeys: (keys: number[]) => void
}

export function MidiLoadTab({ guideEnabled, setGuideEnabled, setGuideKeys }: MidiLoadTabProps) {
  const [chordProgression, setChordProgression] = useState<ChordProgressionItem[]>([])
  const [fileName, setFileName]       = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isPlaying, setIsPlaying]     = useState(false)
  const [isPaused, setIsPaused]       = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [fileBpm, setFileBpm]         = useState<number | null>(null)
  const [midiBaseBpm, setMidiBaseBpm] = useState(DEFAULT_BPM)
  const [bpmInputStr, setBpmInputStr]   = useState(String(DEFAULT_BPM))
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1)
  const [loopEnabled, setLoopEnabled]   = useState(false)
  const [audioEnabled, setAudioEnabled]  = useState(true)
  const [mp3Url, setMp3Url]           = useState<string | null>(null)
  const [mp3FileName, setMp3FileName] = useState("")
  const [mp3Enabled, setMp3Enabled]   = useState(true)
  const [mp3Offset, setMp3Offset]     = useState(0)
  const [mp3OffsetStr, setMp3OffsetStr] = useState("0")
  const startTimeRef    = useRef<number>(0)
  const intervalRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef        = useRef<HTMLAudioElement | null>(null)
  const chordStripRef   = useRef<HTMLDivElement>(null)
  const activeChordRef  = useRef<HTMLButtonElement | null>(null)
  const loopEnabledRef  = useRef(false)
  const audioEnabledRef = useRef(true)
  const mp3EnabledRef   = useRef(true)
  const mp3OffsetRef    = useRef(0)

  const effectiveFileBpm = fileBpm ?? DEFAULT_BPM
  const midiPlaybackRate = effectiveFileBpm > 0
    ? (midiBaseBpm / effectiveFileBpm) * speedMultiplier
    : speedMultiplier

  function getBpmFromMidi(arrayBuffer: ArrayBuffer): number | null {
    try {
      const midi = new Midi(arrayBuffer)
      const bpm = midi.header.tempos[0]?.bpm
      return typeof bpm === "number" && bpm > 0 ? Math.round(bpm) : null
    } catch { return null }
  }

  const handleMidiSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setIsAnalyzing(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const bpm = getBpmFromMidi(arrayBuffer)
      setFileBpm(bpm)
      setMidiBaseBpm(bpm ?? DEFAULT_BPM)
      setBpmInputStr(String(bpm ?? DEFAULT_BPM))
      setChordProgression(parseMidiToChordProgression(arrayBuffer, (m) => console.log(m)))
      setCurrentIndex(0)
    } catch (err) { alert("MIDIの解析に失敗しました") }
    finally { setIsAnalyzing(false) }
  }


  const handleMp3Select = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (mp3Url) URL.revokeObjectURL(mp3Url)
    const url = URL.createObjectURL(file)
    setMp3Url(url)
    setMp3FileName(file.name)
    audioRef.current = new Audio(url)
  }

  function getElapsedSecondsUpToIndex(index: number): number {
    let sum = 0
    for (let i = 0; i < index && i < chordProgression.length; i++) {
      sum += chordProgression[i].duration / midiPlaybackRate
    }
    return sum
  }

  const mp3TimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startMp3 = (fromMidiTime: number) => {
    if (!audioRef.current) return
    if (mp3TimeoutRef.current) { clearTimeout(mp3TimeoutRef.current); mp3TimeoutRef.current = null }
    const mp3Start = fromMidiTime - mp3OffsetRef.current
    audioRef.current.playbackRate = speedMultiplier
    if (mp3Start >= 0) {
      audioRef.current.currentTime = mp3Start
      if (mp3EnabledRef.current) audioRef.current.play().catch(() => {})
    } else {
      audioRef.current.currentTime = 0
      if (mp3EnabledRef.current) {
        mp3TimeoutRef.current = setTimeout(() => {
          audioRef.current?.play().catch(() => {})
        }, Math.abs(mp3Start) * 1000)
      }
    }
  }

  const handlePlay = () => {
    if (chordProgression.length === 0) return
    audioEngine.stopAll()
    startTimeRef.current = Date.now()
    setCurrentIndex(0)
    setIsPlaying(true)
    setIsPaused(false)
    startMp3(0)
  }

  const handlePlayFromIndex = (index: number) => {
    if (chordProgression.length === 0 || index < 0 || index >= chordProgression.length) return
    audioEngine.stopAll()
    const elapsedSec = getElapsedSecondsUpToIndex(index)
    startTimeRef.current = Date.now() - elapsedSec * 1000
    setCurrentIndex(index)
    setIsPlaying(true)
    setIsPaused(false)
    startMp3(elapsedSec)
  }

  const tick = () => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000
    let sum = 0
    for (let i = 0; i < chordProgression.length; i++) {
      const d = chordProgression[i].duration / midiPlaybackRate
      if (sum + d > elapsed) { setCurrentIndex(i); return }
      sum += d
    }
    // 末尾到達
    if (loopEnabledRef.current) {
      startTimeRef.current = Date.now()
      if (audioRef.current) { audioRef.current.currentTime = 0; if (mp3EnabledRef.current) audioRef.current.play().catch(() => {}) }
      setCurrentIndex(0)
    } else {
      setCurrentIndex(chordProgression.length - 1)
      setIsPlaying(false)
      setIsPaused(false)
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      audioEngine.stopAll()
      if (audioRef.current) audioRef.current.pause()
    }
  }

  const handlePause = useCallback(() => {
    setIsPaused(true)
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    if (audioRef.current) audioRef.current.pause()
  }, [])

  const handleResume = useCallback(() => {
    const elapsedSec = getElapsedSecondsUpToIndex(currentIndex)
    startTimeRef.current = Date.now() - elapsedSec * 1000
    startMp3(elapsedSec)
    setIsPaused(false)
  }, [])

  const handleStop = () => {
    setIsPlaying(false)
    setIsPaused(false)
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    if (mp3TimeoutRef.current) { clearTimeout(mp3TimeoutRef.current); mp3TimeoutRef.current = null }
    audioEngine.stopAll()
    if (audioRef.current) audioRef.current.pause()
  }

  useEffect(() => {
    if (!isPlaying || isPaused || chordProgression.length === 0) return
    intervalRef.current = setInterval(tick, 50)
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null } }
  }, [isPlaying, isPaused, chordProgression, midiPlaybackRate])

  useEffect(() => {
    if (!isPlaying || chordProgression.length === 0) return
    const item = chordProgression[currentIndex]
    if (!item) return
    audioEngine.stopAll()
    if (!item.chord) return
    const notes = chordNameToNotes(item.chord, 4)
    const durationMs = (item.duration / midiPlaybackRate) * 1000
    if (audioEnabledRef.current) audioEngine.playChord(notes, Math.min(durationMs, 2000), 90)
  }, [currentIndex, isPlaying, chordProgression, midiPlaybackRate])

  useEffect(() => {
    if (!guideEnabled || chordProgression.length === 0) { setGuideKeys([]); return }
    const item = chordProgression[currentIndex]
    const chordName = item?.chord?.trim()
    if (!chordName) { setGuideKeys([]); return }
    try {
      const notes = chordNameToNotes(chordName, 4)
      setGuideKeys(notes.filter(n => n >= KEYBOARD_MIDI_MIN && n <= KEYBOARD_MIDI_MAX))
    } catch { setGuideKeys([]) }
  }, [guideEnabled, chordProgression, currentIndex, setGuideKeys])

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speedMultiplier
  }, [speedMultiplier])

  useEffect(() => {
    if (!audioRef.current) return
    if (isPlaying && !isPaused) {
      if (mp3Enabled) {
        audioRef.current.currentTime = getElapsedSecondsUpToIndex(currentIndex)
        audioRef.current.play().catch(() => {})
      } else {
        audioRef.current.pause()
      }
    }
  }, [mp3Enabled])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (mp3Url) URL.revokeObjectURL(mp3Url)
    }
  }, [mp3Url])

  // Spaceキーで一時停止／再開
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'LABEL') return
      e.preventDefault()
      if (!isPlaying) return
      if (isPaused) handleResume()
      else handlePause()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isPlaying, isPaused, handleResume, handlePause])

  // refをstateと同期
  useEffect(() => { loopEnabledRef.current = loopEnabled }, [loopEnabled])
  useEffect(() => { audioEnabledRef.current = audioEnabled }, [audioEnabled])
  useEffect(() => { mp3EnabledRef.current = mp3Enabled }, [mp3Enabled])
  useEffect(() => { mp3OffsetRef.current = mp3Offset }, [mp3Offset])

  // アクティブコードを自動スクロール（ページスクロールさせない）
  useEffect(() => {
    const strip = chordStripRef.current
    const btn   = activeChordRef.current
    if (!strip || !btn) return
    const btnRect   = btn.getBoundingClientRect()
    const stripRect = strip.getBoundingClientRect()
    const offset    = btnRect.left - stripRect.left - stripRect.width / 2 + btnRect.width / 2
    strip.scrollBy({ left: offset, behavior: 'smooth' })
  }, [currentIndex])

  const currentChord = chordProgression[currentIndex]

  // Styles
  const card: React.CSSProperties = {
    background: 'rgba(235,240,248,0.9)',
    borderRadius: 16,
    border: 'none',
    boxShadow: '5px 5px 12px rgba(130,150,185,0.45), -5px -5px 12px rgba(255,255,255,0.85)',
    padding: '16px 20px',
  }
  // ニューモフィズム窪み
  const insetCard: React.CSSProperties = {
    background: 'rgba(210,220,235,0.45)',
    borderRadius: 12,
    boxShadow: 'inset 2px 2px 6px rgba(150,165,195,0.35), inset -2px -2px 6px rgba(255,255,255,0.7)',
    border: 'none',
    padding: '10px 14px',
    fontSize: 12,
    color: '#7a90b0',
    marginBottom: 12,
  }
  // ニューモフィズムボタン
  const btn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 14px',
    background: 'rgba(235,240,248,0.9)',
    color: '#6b8aaa',
    border: 'none',
    borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer',
    boxShadow: '3px 3px 7px rgba(140,160,195,0.4), -3px -3px 7px rgba(255,255,255,0.8)',
  }
  const btnNavy = btn
  const btnGray = btn
  const btnAmber: React.CSSProperties = { ...btn }

  return (
    <div style={{ padding: '20px 28px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>





      {/* MP3伴奏（MIDIロード後に表示） */}
      {fileName && !isAnalyzing && (
        <div style={{
          background: 'rgba(235,240,248,0.9)',
          borderRadius: 16,
          boxShadow: '5px 5px 12px rgba(130,150,185,0.45), -5px -5px 12px rgba(255,255,255,0.85)',
          border: 'none',
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          {!mp3FileName ? (
            <label style={{ ...btn, cursor: 'pointer', width: 'fit-content' }}>
              <Music2 size={14} /> MP3伴奏を追加（任意）
              <input type="file" accept=".mp3,audio/mpeg" onChange={handleMp3Select} style={{ display: 'none' }} />
            </label>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#7a90b0' }}>
                <Music2 size={13} />
                <span>{mp3FileName}</span>
              </div>
              <label style={{ ...btn, cursor: 'pointer', width: 'fit-content' }}>
                音源を変更
                <input type="file" accept=".mp3,audio/mpeg" onChange={handleMp3Select} style={{ display: 'none' }} />
              </label>
              <button
                onClick={() => setMp3Enabled(v => !v)}
                title="MP3再生"
                style={{
                  width: 36, height: 36,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: 'rgba(235,240,248,0.9)',
                  color: mp3Enabled ? '#4a6a8a' : '#b0bfd0',
                  boxShadow: mp3Enabled
                    ? 'inset 2px 2px 5px rgba(130,150,185,0.4), inset -2px -2px 5px rgba(255,255,255,0.8)'
                    : '3px 3px 7px rgba(130,150,185,0.4), -3px -3px 7px rgba(255,255,255,0.8)',
                  transition: 'box-shadow 0.15s, color 0.15s',
                }}
              >
                <Volume2 size={15} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Delay</span>
                <input
                  type="number"
                  value={mp3OffsetStr}
                  step="0.01"
                  min="-10"
                  max="10"
                  onChange={e => setMp3OffsetStr(e.target.value)}
                  onBlur={() => {
                    const v = parseFloat(mp3OffsetStr)
                    const clamped = isNaN(v) ? 0 : Math.min(10, Math.max(-10, v))
                    setMp3Offset(clamped)
                    setMp3OffsetStr(String(clamped))
                  }}
                  style={{
                    width: 64, textAlign: 'center', fontWeight: 500, color: '#4a6a8a',
                    fontFamily: 'monospace', fontSize: 13,
                    background: 'rgba(210,220,235,0.45)', border: 'none', borderRadius: 8,
                    boxShadow: 'inset 2px 2px 5px rgba(130,150,185,0.35), inset -2px -2px 5px rgba(255,255,255,0.7)',
                    padding: '4px 6px', outline: 'none',
                  }}
                />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>秒</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MIDIカード — 常に表示 */}
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ヘッダー行: MIDIを開くボタン + 読み込み済みならファイル名 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {fileName && (
            <span style={{ fontSize: 12, color: '#7a90b0', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Music2 size={13} /> {fileName}
            </span>
          )}
          <label style={{ ...btnNavy, cursor: 'pointer', fontSize: 13, padding: '7px 16px', width: 'fit-content' }}>
            <Music2 size={13} /> {fileName ? '伴奏用MIDIを変更' : '伴奏用MIDIを開く'}
            <input type="file" accept=".mid,.midi" onChange={handleMidiSelect} style={{ display: 'none' }} />
          </label>
          {isAnalyzing && <span style={{ fontSize: 12, color: '#94a3b8' }}>解析中...</span>}
        </div>

        {(fileName || chordProgression.length > 0) && !isAnalyzing && (<>

          {chordProgression.length > 0 && (<>
            {/* BPM・速度・ガイド */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>BPM</span>
                <button style={btnGray} onClick={() => { const v = Math.max(BPM_MIN, midiBaseBpm - 1); setMidiBaseBpm(v); setBpmInputStr(String(v)) }}>−</button>
                <input
                  type="number"
                  value={bpmInputStr}
                  onChange={e => setBpmInputStr(e.target.value)}
                  onBlur={() => {
                    const v = parseInt(bpmInputStr)
                    const clamped = isNaN(v) ? DEFAULT_BPM : Math.min(BPM_MAX, Math.max(BPM_MIN, v))
                    setMidiBaseBpm(clamped)
                    setBpmInputStr(String(clamped))
                  }}
                  style={{
                    width: 52, textAlign: 'center', fontWeight: 600, color: '#4a6a8a',
                    fontFamily: 'monospace', fontSize: 14,
                    background: 'rgba(210,220,235,0.45)', border: 'none', borderRadius: 8,
                    boxShadow: 'inset 2px 2px 5px rgba(130,150,185,0.35), inset -2px -2px 5px rgba(255,255,255,0.7)',
                    padding: '4px 6px', outline: 'none',
                  }}
                />
                <button style={btnGray} onClick={() => { const v = Math.min(BPM_MAX, midiBaseBpm + 1); setMidiBaseBpm(v); setBpmInputStr(String(v)) }}>+</button>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  {fileBpm != null ? `(ファイル: ${fileBpm})` : ``}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>速度</span>
                <Select value={String(speedMultiplier)} onValueChange={v => setSpeedMultiplier(Number(v))}>
                  <SelectTrigger style={{ width: 110, height: 32, fontSize: 12, background: 'rgba(235,240,248,0.9)', border: 'none', color: '#4a6a8a', borderRadius: 9, boxShadow: '3px 3px 7px rgba(130,150,185,0.4), -3px -3px 7px rgba(255,255,255,0.8)' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: 'rgba(235,240,248,0.97)', border: 'none', borderRadius: 10, boxShadow: '4px 4px 10px rgba(130,150,185,0.45), -4px -4px 10px rgba(255,255,255,0.85)' }}>
                    {SPEED_OPTIONS.map(rate => (
                      <SelectItem key={rate} value={String(rate)}>
                        {rate === 1 ? "等倍" : `${rate}倍速`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {[
                  { id: 'audio', icon: <Volume2 size={15} />,   value: audioEnabled,  set: setAudioEnabled },
                  { id: 'guide', icon: <Lightbulb size={15} />, value: guideEnabled,  set: setGuideEnabled },
                  { id: 'loop',  icon: <Repeat size={15} />,    value: loopEnabled,   set: setLoopEnabled  },
                ].map(({ id, icon, value, set }) => (
                  <button
                    key={id}
                    onClick={() => set(!value)}
                    title={id === 'guide' ? 'ガイド' : id === 'loop' ? 'ループ' : '音源'}
                    style={{
                      width: 36, height: 36,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: 'rgba(235,240,248,0.9)',
                      color: value ? '#4a6a8a' : '#b0bfd0',
                      boxShadow: value
                        ? 'inset 2px 2px 5px rgba(130,150,185,0.4), inset -2px -2px 5px rgba(255,255,255,0.8)'
                        : '3px 3px 7px rgba(130,150,185,0.4), -3px -3px 7px rgba(255,255,255,0.8)',
                      transition: 'box-shadow 0.15s, color 0.15s',
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* 仕切り */}
            <div style={{ height: 1, background: 'rgba(180,195,220,0.3)' }} />

            {/* 現在コード */}
            <div style={{ textAlign: 'center', padding: '4px 0 8px' }}>
              <span style={{ fontSize: 40, fontWeight: 600, fontFamily: "'Outfit', sans-serif", color: '#4a6a8a', letterSpacing: '-0.03em' }}>
                {currentChord?.chord || "—"}
              </span>
            </div>

            {/* コードストリップ */}
            <div ref={chordStripRef} style={{ overflowX: 'auto', padding: '8px 4px', margin: '-8px -4px', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="hide-scrollbar">
              <div style={{ display: 'flex', gap: 3, minWidth: 'max-content' }}>
                {chordProgression.map((item, index) => (
                  <button
                    key={index}
                    ref={index === currentIndex ? activeChordRef : null}
                    onClick={() => handlePlayFromIndex(index)}
                    style={{
                      flexShrink: 0,
                      padding: '6px 10px',
                      borderRadius: 7,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: index === currentIndex ? 15 : 13,
                      fontWeight: index === currentIndex ? 600 : 400,
                      fontFamily: "'Outfit', sans-serif",
                      background: index === currentIndex ? 'rgba(255,255,255,0.95)' : 'rgba(235,240,248,0.9)',
                      borderColor: 'transparent',
                      color: index === currentIndex ? '#4a6a8a' : '#94a3b8',
                      boxShadow: index === currentIndex
                        ? '3px 3px 6px rgba(130,150,185,0.4), -3px -3px 6px rgba(255,255,255,0.7)'
                        : 'inset 1px 1px 3px rgba(130,150,185,0.25), inset -1px -1px 3px rgba(255,255,255,0.6)',
                      transition: 'background 0.1s, box-shadow 0.1s, color 0.1s',
                    }}
                  >
                    {item.chord || "—"}
                  </button>
                ))}
              </div>
            </div>

            {/* 再生コントロール */}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              {!isPlaying ? (
                <button style={btnNavy} onClick={handlePlay}><Play size={16} /> 再生</button>
              ) : isPaused ? (
                <>
                  <button style={btnNavy} onClick={handleResume}><Play size={16} /> 再開</button>
                  <button style={btnGray} onClick={handleStop}><Square size={16} /> 停止</button>
                </>
              ) : (
                <>
                  <button style={btnAmber} onClick={handlePause}><Pause size={16} /> 一時停止</button>
                  <button style={btnGray} onClick={handleStop}><Square size={16} /> 停止</button>
                </>
              )}
            </div>
          </>)}

        </>)}
      </div>


    </div>
  )
}
