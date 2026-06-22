import { useEffect, useRef } from 'react'

interface Note {
  pitch: string
  position: number
}

interface MusicalStaffProps {
  notes?: Note[]
  compact?: boolean
}

export function MusicalStaff({ notes = [], compact = false }: MusicalStaffProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width  = canvas.width
    const height = canvas.height
    ctx.clearRect(0, 0, width, height)

    const lineSpacing = compact ? 16 : 20
    const startY = height / 2 - lineSpacing * 2

    // Staff lines
    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 1.5
    for (let i = 0; i < 5; i++) {
      const y = startY + i * lineSpacing
      ctx.beginPath()
      ctx.moveTo(50, y)
      ctx.lineTo(width - 50, y)
      ctx.stroke()
    }

    // Treble clef
    ctx.fillStyle = '#94a3b8'
    ctx.font = `bold ${compact ? 72 : 96}px serif`
    ctx.fillText('\u{1D11E}', 55, startY + lineSpacing * 3.2)

    if (notes.length === 0) return

    // Notes
    notes.forEach((note, index) => {
      const x = (compact ? 160 : 200) + index * (compact ? 48 : 60)
      const y = startY + lineSpacing * 4 - note.position * (lineSpacing / 2)

      // Ledger lines below staff
      if (note.position < 0) {
        ctx.strokeStyle = '#94a3b8'
        ctx.lineWidth = 1.5
        for (let p = -2; p >= note.position - (note.position % 2 === 0 ? 0 : 1); p -= 2) {
          const ly = startY + lineSpacing * 4 - p * (lineSpacing / 2)
          ctx.beginPath()
          ctx.moveTo(x - 12, ly)
          ctx.lineTo(x + 12, ly)
          ctx.stroke()
        }
      }
      // Ledger lines above staff
      if (note.position > 8) {
        ctx.strokeStyle = '#94a3b8'
        ctx.lineWidth = 1.5
        for (let p = 10; p <= note.position + (note.position % 2 === 0 ? 0 : 1); p += 2) {
          const ly = startY + lineSpacing * 4 - p * (lineSpacing / 2)
          ctx.beginPath()
          ctx.moveTo(x - 12, ly)
          ctx.lineTo(x + 12, ly)
          ctx.stroke()
        }
      }

      // Note head
      ctx.fillStyle = '#1e3a5f'
      ctx.beginPath()
      ctx.ellipse(x, y, compact ? 6 : 8, compact ? 5 : 6, -0.3, 0, Math.PI * 2)
      ctx.fill()

      // Stem
      ctx.fillRect(x + (compact ? 5 : 7), y - (compact ? 26 : 35), 2, compact ? 26 : 35)
    })
  }, [notes, compact])

  const height = compact ? 140 : 200

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={1200}
        height={height}
        style={{ width: '100%', height: 'auto' }}
      />
    </div>
  )
}
