import { Music } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'

interface TopNavProps {
  midiInputs: MIDIInput[]
  selectedMidiInput: string
  onMidiInputChange: (inputId: string) => void
}

export function TopNav({ midiInputs, selectedMidiInput, onMidiInputChange }: TopNavProps) {
  const isConnected = midiInputs.length > 0 && !!selectedMidiInput

  return (
    <nav style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      padding:        '0 28px',
      height:         56,
      position:       'relative',
      zIndex:         10,
      flexShrink:     0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32,
          background: '#1e293b',
          borderRadius: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Music style={{ width: 16, height: 16, color: '#e2e8f0' }} />
        </div>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', letterSpacing: '-0.01em' }}>
          Chord Flow
        </span>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 11, color: '#7a90b0', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>MIDI</span>
        <Select
          value={selectedMidiInput || 'none'}
          onValueChange={(v) => v !== 'none' && onMidiInputChange(v)}
        >
          <SelectTrigger style={{ width: 180, height: 30, fontSize: 12, background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(200,215,235,0.7)', color: '#475569', borderRadius: 8 }}>
            <SelectValue placeholder="デバイスなし" />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-200">
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

        {/* 接続ステータス */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 20,
          background: isConnected ? 'rgba(74,222,128,0.12)' : 'rgba(0,0,0,0.05)',
          border: `1px solid ${isConnected ? 'rgba(74,222,128,0.3)' : 'rgba(0,0,0,0.08)'}`,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: isConnected ? '#22c55e' : '#cbd5e1',
          }} />
          <span style={{ fontSize: 11, color: isConnected ? '#16a34a' : '#94a3b8', fontWeight: 500 }}>
            {isConnected ? 'Connected' : 'No Device'}
          </span>
        </div>
      </div>
    </nav>
  )
}
