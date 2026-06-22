import { Clock, Upload } from 'lucide-react'
import { ScrollArea } from '@/app/components/ui/scroll-area'
import { MidiFileAnalyzer } from '@/app/components/MidiFileAnalyzer'
import { useState } from 'react'

interface ChordHistoryItem {
  chord: string
  time: string
}

interface ChordLibrarySidebarProps {
  history?: ChordHistoryItem[]
}

export function ChordLibrarySidebar({ history = [] }: ChordLibrarySidebarProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'midi'>('history')

  const tabStyle = (tab: 'history' | 'midi') => ({
    flex:         1,
    padding:      '6px 0',
    borderRadius: 8,
    fontSize:     13,
    fontWeight:   500 as const,
    cursor:       'pointer' as const,
    border:       'none',
    display:      'flex',
    alignItems:   'center' as const,
    justifyContent: 'center' as const,
    gap:          6,
    transition:   'all 0.15s',
    background:   activeTab === tab ? '#ffffff' : 'transparent',
    color:        activeTab === tab ? '#0f172a' : '#94a3b8',
    boxShadow:    activeTab === tab ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
  })

  return (
    <div style={{
      width:          300,
      background:     'rgba(255,255,255,0.6)',
      backdropFilter: 'blur(20px)',
      borderLeft:     '1px solid rgba(255,255,255,0.8)',
      display:        'flex',
      flexDirection:  'column',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
          Chord Library
        </h2>
        {/* Tab switcher */}
        <div style={{
          display:      'flex',
          gap:          4,
          background:   'rgba(0,0,0,0.04)',
          borderRadius: 10,
          padding:      4,
        }}>
          <button onClick={() => setActiveTab('history')} style={tabStyle('history')}>
            <Clock size={13} />
            履歴
          </button>
          <button onClick={() => setActiveTab('midi')} style={tabStyle('midi')}>
            <Upload size={13} />
            MIDI
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '16px 20px', overflow: 'hidden' }}>
        {activeTab === 'history' ? (
          <ScrollArea className="h-full">
            {history.length === 0 ? (
              <p style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>
                まだコードはありません
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.map((item, i) => (
                  <div key={i} style={{
                    padding:      '10px 14px',
                    background:   'rgba(255,255,255,0.7)',
                    borderRadius: 10,
                    border:       '1px solid rgba(0,0,0,0.06)',
                    cursor:       'pointer',
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1e3a5f' }}>
                      {item.chord}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      {item.time}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        ) : (
          <MidiFileAnalyzer />
        )}
      </div>
    </div>
  )
}
