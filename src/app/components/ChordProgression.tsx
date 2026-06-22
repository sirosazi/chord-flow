import { motion } from 'motion/react';

interface ChordProgressionProps {
  chords: string[];
  currentIndex: number;
  onChordClick?: (chord: string, index: number) => void;
}

export function ChordProgression({ chords, currentIndex, onChordClick }: ChordProgressionProps) {
  return (
    <div className="py-8 px-6">
      <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Chord Progression</h3>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {chords.map((chord, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onChordClick?.(chord, index)}
            className={`
              relative min-w-[120px] px-6 py-4 rounded-lg text-center transition-all duration-300 cursor-pointer
              ${index === currentIndex 
                ? 'bg-cyan-500/20 border-2 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)]' 
                : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50 hover:border-gray-600'
              }
            `}
          >
            <div className={`
              text-xl font-bold
              ${index === currentIndex ? 'text-cyan-300' : 'text-gray-300'}
            `}>
              {chord}
            </div>
            {index === currentIndex && (
              <motion.div
                className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-cyan-400 rounded-full"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}