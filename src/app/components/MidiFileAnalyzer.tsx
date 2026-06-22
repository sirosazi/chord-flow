import { useState } from "react"
import { Midi } from "@tonejs/midi"
import { Upload, Music } from "lucide-react"
import { detectChord } from "@/app/utils/chord-detector"

export interface ChordProgressionItem {
  time: number
  chord: string
  duration: number
}

/** MIDIのArrayBufferからコード進行を解析 */
export function parseMidiToChordProgression(
  arrayBuffer: ArrayBuffer,
  addLog: (message: string) => void,
  timeStep: number = 0.25
): ChordProgressionItem[] {
  const midi = new Midi(arrayBuffer)
  addLog(`MIDIパース成功: ${midi.tracks.length} tracks, ${midi.duration.toFixed(2)}秒`)

  const progression: ChordProgressionItem[] = []
  const allNotes: Array<{ time: number; midi: number; duration: number }> = []

  midi.tracks.forEach((track) => {
    track.notes.forEach(note => {
      allNotes.push({ time: note.time, midi: note.midi, duration: note.duration })
    })
  })

  if (allNotes.length === 0) return progression

  allNotes.sort((a, b) => a.time - b.time)
  const maxTime = Math.max(...allNotes.map(n => n.time + n.duration))

  for (let time = 0; time < maxTime; time += timeStep) {
    const activeNotes = allNotes
      .filter(note => note.time <= time && note.time + note.duration > time)
      .map(note => note.midi)

    let chordName = ""
    if (activeNotes.length >= 2) {
      const chord = detectChord(activeNotes)
      if (chord.name) chordName = chord.name
    }

    const lastItem = progression[progression.length - 1]
    if (lastItem && lastItem.chord === chordName) {
      lastItem.duration += timeStep
    } else {
      progression.push({ time, chord: chordName, duration: timeStep })
    }
  }

  addLog(`検出されたコード数: ${progression.length}`)
  return progression
}

export function MidiFileAnalyzer() {
  const [chordProgression, setChordProgression] = useState<ChordProgressionItem[]>([])
  const [fileName, setFileName]   = useState<string>("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [debugLog, setDebugLog]   = useState<string[]>([])

  const addLog = (msg: string) => setDebugLog(prev => [...prev, msg])

  const runAnalysis = (arrayBuffer: ArrayBuffer, name: string) => {
    setDebugLog([])
    setIsAnalyzing(true)
    setFileName(name)
    try {
      const progression = parseMidiToChordProgression(arrayBuffer, addLog)
      setChordProgression(progression)
    } catch (error) {
      alert(`解析失敗: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    runAnalysis(await file.arrayBuffer(), file.name)
  }

  const handleLoadCodetest = async () => {
    setIsAnalyzing(true)
    try {
      const res = await fetch("/codetest.mid")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      runAnalysis(await res.arrayBuffer(), "codetest.mid")
    } catch (err) {
      addLog(`読み込み失敗: ${err instanceof Error ? err.message : String(err)}`)
      setIsAnalyzing(false)
    }
  }

  const generateTestMidi = () => {
    const midi = new Midi()
    const track = midi.addTrack()
    const chords = [
      { notes: [60, 64, 67], time: 0 },
      { notes: [57, 60, 64], time: 2 },
      { notes: [53, 57, 60], time: 4 },
      { notes: [55, 59, 62], time: 6 },
    ]
    chords.forEach(({ notes, time }) => {
      notes.forEach(note => track.addNote({ midi: note, time, duration: 1.8, velocity: 0.8 }))
    })
    const blob = new Blob([midi.toArray()], { type: "audio/midi" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "test-chords.mid"; a.click()
    URL.revokeObjectURL(url)
  }

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`

  const btnPrimary: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, width: '100%', padding: '10px 16px', background: '#1e293b',
    color: '#e2e8f0', border: 'none', borderRadius: 10, fontSize: 13,
    fontWeight: 500, cursor: 'pointer',
  }
  const btnSecondary: React.CSSProperties = {
    ...btnPrimary, background: 'rgba(0,0,0,0.06)', color: '#475569',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label style={{ ...btnPrimary, cursor: 'pointer' }}>
        <Upload size={14} /> MIDIファイルを開く
        <input type="file" accept=".mid,.midi" onChange={handleFileSelect} style={{ display: 'none' }} />
      </label>
      <button style={btnSecondary} onClick={handleLoadCodetest} disabled={isAnalyzing}>
        <Music size={14} /> codetest.mid で確認
      </button>

      {isAnalyzing && (
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '8px 0' }}>解析中...</p>
      )}
      {fileName && !isAnalyzing && (
        <p style={{ fontSize: 12, color: '#94a3b8' }}>📄 {fileName}</p>
      )}

      {chordProgression.length > 0 && !isAnalyzing && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
            コード進行 ({chordProgression.length}個)
          </p>
          <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {chordProgression.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 10px', background: 'rgba(255,255,255,0.7)',
                borderRadius: 8, border: '1px solid rgba(0,0,0,0.05)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', width: 32 }}>{formatTime(item.time)}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1e3a5f' }}>{item.chord}</span>
                </div>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.duration.toFixed(1)}s</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {chordProgression.length === 0 && !isAnalyzing && !fileName && (
        <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>
          MIDIファイルを選択してください
        </p>
      )}

      <button style={btnSecondary} onClick={generateTestMidi}>
        <Music size={14} /> テストMIDIを生成
      </button>
    </div>
  )
}
