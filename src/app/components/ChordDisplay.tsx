import { motion, AnimatePresence } from 'motion/react'

interface ChordDisplayProps {
  chordName: string
  intervals: string[]
  noteNames?: string[]   // 実際の音名 (例: ["C", "E", "G"])
  size?: 'default' | 'compact'
}

export function ChordDisplay({ chordName, intervals, noteNames, size = 'default' }: ChordDisplayProps) {
  const isCompact = size === 'compact'
  const pills = noteNames && noteNames.length > 0 ? noteNames : intervals

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      // height固定でコード表示前後のサイズ変化を防ぐ
      height:         isCompact ? 80 : 130,
      overflow:       'hidden',
    }}>
      <AnimatePresence mode="wait">
        {chordName ? (
          <motion.div
            key={chordName}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            style={{ textAlign: 'center' }}
          >
            <h2 style={{
              fontSize:      isCompact ? 40 : 48,
              fontWeight:    600,
              fontFamily:    "'Outfit', sans-serif",
              color:         '#4a6a8a',
              letterSpacing: '-0.03em',
              lineHeight:    1,
              marginBottom:  isCompact ? 4 : 8,
            }}>
              {chordName}
            </h2>
            {!isCompact && pills.length > 0 && (
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                {pills.map((p, i) => (
                  <span key={i} style={{
                    fontSize:     13,
                    fontWeight:   500,
                    color:        '#6b8aaa',
                    background:   'rgba(235,240,248,0.9)',
                    borderRadius: 8,
                    padding:      '3px 10px',
                    boxShadow:    'inset 2px 2px 4px rgba(130,150,185,0.3), inset -2px -2px 4px rgba(255,255,255,0.75)',
                  }}>
                    {p}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <p key="empty" style={{ fontSize: isCompact ? 13 : 14, color: '#94a3b8', margin: 0 }}>
            鍵盤を押してください
          </p>
        )}
      </AnimatePresence>
    </div>
  )
}
