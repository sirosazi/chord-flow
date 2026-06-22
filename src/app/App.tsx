import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { ChordDisplay } from "@/app/components/ChordDisplay"
import { PianoKeyboard } from "@/app/components/PianoKeyboard"
import { MidiLoadTab } from "@/app/components/MidiLoadTab"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"
import { detectChord, midiNoteToNoteName } from "@/app/utils/chord-detector"
import { audioEngine } from "@/app/utils/audio-engine"
import { keyboardToMidi } from "@/app/utils/keyboard-mapping"

function App() {
  const [midiAccess, setMidiAccess] = useState<MIDIAccess | null>(null)
  const [midiInputs, setMidiInputs] = useState<MIDIInput[]>([])
  const [selectedMidiInput, setSelectedMidiInput] = useState<string>("")
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set())
  const [currentChord, setCurrentChord] = useState({ name: "", intervals: [] as string[] })
  const [noteNames, setNoteNames] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("free")
  const [guideEnabled, setGuideEnabled] = useState(true)
  const [guideKeys, setGuideKeys] = useState<number[]>([])

  useEffect(() => { return () => { audioEngine.stopAll() } }, [])

  useEffect(() => {
    const handleGlobalMouseUp = () => { audioEngine.stopAll(); setPressedKeys(new Set()) }
    window.addEventListener("mouseup", handleGlobalMouseUp)
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp)
  }, [])

  useEffect(() => {
    if (!navigator.requestMIDIAccess) return
    navigator.requestMIDIAccess().then((access) => {
      setMidiAccess(access)
      updateMidiInputs(access)
      access.addEventListener("statechange", () => updateMidiInputs(access))
    }).catch(() => {})
  }, [])

  const updateMidiInputs = (access: MIDIAccess) => {
    const inputs = Array.from(access.inputs.values())
    setMidiInputs(inputs)
    if (inputs.length > 0 && !selectedMidiInput) setSelectedMidiInput(inputs[0].id || "")
  }

  const handleMidiMessage = useCallback((event: MIDIMessageEvent) => {
    const [status, note, velocity] = event.data
    const command = status >> 4
    if (command === 9 && velocity > 0) {
      setPressedKeys((prev) => new Set(prev).add(note))
      audioEngine.playNote(note, velocity)
    } else if (command === 8 || (command === 9 && velocity === 0)) {
      setPressedKeys((prev) => { const s = new Set(prev); s.delete(note); return s })
      audioEngine.stopNote(note)
    }
  }, [])

  useEffect(() => {
    if (!midiAccess || !selectedMidiInput) return
    const input = midiAccess.inputs.get(selectedMidiInput)
    if (!input) return
    input.addEventListener("midimessage", handleMidiMessage as any)
    return () => input.removeEventListener("midimessage", handleMidiMessage as any)
  }, [midiAccess, selectedMidiInput, handleMidiMessage])

  useEffect(() => {
    const notesArray = Array.from(pressedKeys)
    const detected = detectChord(notesArray)
    setCurrentChord({ name: detected.name, intervals: detected.intervals })
    const pitchClasses = [...new Set(notesArray.map(n => midiNoteToNoteName(n).replace(/\d+/, "")))]
    setNoteNames(pitchClasses)
  }, [pressedKeys])

  const handleKeyClick = useCallback((midiNote: number) => {
    if (pressedKeys.has(midiNote)) {
      setPressedKeys((prev) => { const s = new Set(prev); s.delete(midiNote); return s })
      audioEngine.stopNote(midiNote)
    } else {
      setPressedKeys((prev) => new Set(prev).add(midiNote))
      audioEngine.playNote(midiNote, 100)
    }
  }, [pressedKeys])

  useEffect(() => {
    const down = new Set<string>()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const key = e.key.toLowerCase()
      const midi = keyboardToMidi[key]
      if (midi && !down.has(key)) {
        down.add(key)
        setPressedKeys((prev) => new Set(prev).add(midi))
        audioEngine.playNote(midi, 100)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const midi = keyboardToMidi[key]
      if (midi) {
        down.delete(key)
        setPressedKeys((prev) => { const s = new Set(prev); s.delete(midi); return s })
        audioEngine.stopNote(midi)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("keyup", handleKeyUp) }
  }, [])

  const isConnected = midiInputs.length > 0 && !!selectedMidiInput

  // ニューモフィズム raised カード
  const nmCard: React.CSSProperties = {
    // 周囲のブルーグレーに近い色にすることで影が映える
    background: 'rgba(235,240,248,0.9)',
    borderRadius: 18,
    border: 'none',
    // outer nm shadow + inset で上/左だけ白い縁取り（下/右はフェードアウト）
    boxShadow: '5px 5px 12px rgba(130,150,185,0.45), -5px -5px 12px rgba(255,255,255,0.85), inset 1px 1px 0 rgba(255,255,255,0.9), inset -1px -1px 0 rgba(200,215,235,0)',
  }

  // コード+鍵盤を1枚のカードに収める共通ブロック
  const ChordAndKeys = ({ guideKeys, size }: { guideKeys: number[], size?: 'compact' | 'default' }) => (
    <div style={{ ...nmCard, padding: '20px 20px 20px' }}>
      {/* コード表示エリア — ChordDisplay 内で height 固定 */}
      <ChordDisplay
        chordName={currentChord.name}
        intervals={currentChord.intervals}
        noteNames={noteNames}
        size={size}
      />
      {/* 区切り線 */}
      <div style={{ height: 1, background: 'rgba(180,195,220,0.25)', margin: '4px 0 16px' }} />
      {/* 鍵盤 */}
      <div style={{ overflowX: 'auto', display: 'flex', justifyContent: 'center', paddingBottom: 10 }}>
        <PianoKeyboard
          pressedKeys={Array.from(pressedKeys)}
          guideKeys={guideKeys}
          onKeyDown={handleKeyClick}
          onKeyUp={handleKeyClick}
        />
      </div>
    </div>
  )

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(145deg, #c8d4e6 0%, #d5e1f0 35%, #e0eaf6 65%, #cad5e8 100%)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* 背景グロー */}
      <div style={{ position: 'absolute', top: -80, left: -40, width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,255,255,0.55) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -60, right: -20, width: 260, height: 260, background: 'radial-gradient(circle, rgba(200,215,240,0.4) 0%, transparent 65%)', pointerEvents: 'none' }} />

      {/* アウターカード — 余白を広めに */}
      <div style={{
        flex: 1,
        margin: '24px 28px 28px',
        background: 'rgba(255,255,255,0.28)',
        borderRadius: 24,
        border: '1px solid rgba(255,255,255,0.6)',
        boxShadow: '0 8px 32px rgba(140,160,200,0.12)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
      }}>
        <Tabs value={activeTab} onValueChange={setActiveTab} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          {/* タブのニューモスタイル */}
      <style>{`
        .nm-tab {
          transition: box-shadow 0.2s ease, background 0.2s ease, color 0.2s ease, transform 0.15s ease !important;
        }
        .nm-tab[data-state=active] {
          background: rgba(235,240,248,0.95) !important;
          box-shadow: 2px 2px 4px rgba(140,160,195,0.25), -2px -2px 4px rgba(255,255,255,0.7) !important;
          border: none !important;
          color: #4a6a8a !important;
          font-weight: 500 !important;
        }
        .nm-tab[data-state=inactive] {
          background: transparent !important;
          box-shadow: none !important;
          border: none !important;
          color: #94a3b8 !important;
        }
        /* MIDIセレクタ ドロップダウン item */
        [role=option] {
          border-radius: 10px !important;
          color: #475569 !important;
          font-size: 12px !important;
        }
        [role=option]:hover, [role=option][data-highlighted] {
          background: rgba(255,255,255,0.85) !important;
          box-shadow: 2px 2px 5px rgba(130,150,185,0.3), -2px -2px 5px rgba(255,255,255,0.8) !important;
          color: #334e68 !important;
        }
        /* スクロールバー */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(200,215,235,0.3);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(140,160,195,0.45);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(140,160,195,0.7);
        }
        /* number inputのスピンボタンを非表示 */
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] { -moz-appearance: textfield; }
        /* コードストリップのスクロールバーを非表示 */
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        /* ボタン押下インタラクション（Select除外） */
        button:not([data-slot=select-trigger]):active,
        label:active {
          box-shadow: inset 2px 2px 5px rgba(130,150,185,0.4), inset -2px -2px 5px rgba(255,255,255,0.7) !important;
          transform: scale(0.97);
        }
        /* Switch ニューモフィズム */
        [role=switch] {
          background: rgba(210,220,235,0.6) !important;
          box-shadow: inset 2px 2px 5px rgba(130,150,185,0.35), inset -2px -2px 5px rgba(255,255,255,0.75) !important;
          border: none !important;
        }
        [role=switch][data-state=checked] {
          background: rgba(100,160,220,0.55) !important;
          box-shadow: inset 2px 2px 5px rgba(60,100,160,0.3), inset -2px -2px 5px rgba(180,210,240,0.6) !important;
        }
        [role=switch] span {
          box-shadow: 2px 2px 5px rgba(130,150,185,0.4), -2px -2px 5px rgba(255,255,255,0.8) !important;
          background: rgba(245,248,252,0.95) !important;
        }
      `}</style>

      {/* ヘッダー行 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '14px 20px',
            gap: 16,
            borderBottom: '1px solid rgba(255,255,255,0.4)',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 15, fontWeight: 500, fontFamily: "'Outfit', sans-serif", color: '#6b8aaa', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
              Chord Flow
            </span>

            {/* カスタムタブ — layoutIdでスライド */}
            <div style={{
              background: 'rgba(210,220,235,0.45)',
              boxShadow: 'inset 3px 3px 8px rgba(140,160,195,0.35), inset -3px -3px 8px rgba(255,255,255,0.75)',
              borderRadius: 14,
              padding: 3,
              display: 'inline-flex',
              gap: 3,
              position: 'relative',
            }}>
              {[
                { value: 'free', label: 'フリー練習' },
                { value: 'midi', label: 'MIDI読み込み' },
              ].map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  style={{
                    position: 'relative',
                    borderRadius: 10,
                    padding: '5px 20px',
                    fontSize: 13,
                    fontWeight: activeTab === tab.value ? 500 : 400,
                    color: activeTab === tab.value ? '#4a6a8a' : '#94a3b8',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    zIndex: 1,
                    transition: 'color 0.2s',
                  }}
                >
                  {activeTab === tab.value && (
                    <motion.div
                      layoutId="tab-indicator"
                      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 10,
                        background: 'rgba(235,240,248,0.95)',
                        boxShadow: '2px 2px 4px rgba(140,160,195,0.25), -2px -2px 4px rgba(255,255,255,0.7)',
                        zIndex: -1,
                      }}
                    />
                  )}
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ flex: 1 }} />

            <span style={{ fontSize: 11, color: '#7a90b0', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>MIDI</span>
            <Select
              value={selectedMidiInput || 'none'}
              onValueChange={(v) => v !== 'none' && setSelectedMidiInput(v)}
            >
              <SelectTrigger style={{ width: 160, height: 30, fontSize: 12, background: 'rgba(235,240,248,0.9)', border: 'none', color: '#475569', borderRadius: 10, boxShadow: '3px 3px 7px rgba(130,150,185,0.4), -3px -3px 7px rgba(255,255,255,0.85)' }}>
                <SelectValue placeholder="デバイスなし" />
              </SelectTrigger>
              <SelectContent style={{ background: 'rgba(235,240,248,0.97)', border: 'none', borderRadius: 10, boxShadow: '4px 4px 10px rgba(130,150,185,0.45), -4px -4px 10px rgba(255,255,255,0.85)' }}>
                {midiInputs.length === 0 ? (
                  <SelectItem value="none" className="text-slate-400 text-sm">デバイスなし</SelectItem>
                ) : (
                  midiInputs.map(input => (
                    <SelectItem key={input.id} value={input.id || ''} className="text-slate-700 text-sm">
                      {input.name || 'Unknown Device'}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 20,
              background: isConnected ? 'rgba(74,222,128,0.12)' : 'rgba(0,0,0,0.05)',
              border: `1px solid ${isConnected ? 'rgba(74,222,128,0.3)' : 'rgba(0,0,0,0.08)'}`,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: isConnected ? '#22c55e' : '#cbd5e1' }} />
              <span style={{ fontSize: 11, color: isConnected ? '#16a34a' : '#94a3b8', fontWeight: 500 }}>
                {isConnected ? 'Connected' : 'No Device'}
              </span>
            </div>
          </div>

          {/* コンテンツ */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <TabsContent value="free" style={{ margin: 0, height: '100%', overflowY: 'auto' }}>
              <div style={{ padding: '20px 24px 24px' }}>
                <ChordAndKeys guideKeys={[]} />
              </div>
            </TabsContent>
            <TabsContent value="midi" style={{ margin: 0, height: '100%', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <MidiLoadTab
                  guideEnabled={guideEnabled}
                  setGuideEnabled={setGuideEnabled}
                  setGuideKeys={setGuideKeys}
                />
                <div style={{ padding: '0 28px 24px' }}>
                  <ChordAndKeys guideKeys={guideKeys} size="compact" />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}

export default App
