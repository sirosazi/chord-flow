// PCキーボードからMIDIノートへのマッピング
// C3（MIDI 48）から始まる

export const keyboardToMidi: Record<string, number> = {
  // 下段（白鍵）- C3からC4まで
  'z': 48,  // C3 (ド)
  'x': 50,  // D3 (レ)
  'c': 52,  // E3 (ミ)
  'v': 53,  // F3 (ファ)
  'b': 55,  // G3 (ソ)
  'n': 57,  // A3 (ラ)
  'm': 59,  // B3 (シ)
  ',': 60,  // C4 (ド)
  
  // 下段（黒鍵）
  's': 49,  // C#3 (ド♯)
  'd': 51,  // D#3 (レ♯)
  'g': 54,  // F#3 (ファ♯)
  'h': 56,  // G#3 (ソ♯)
  'j': 58,  // A#3 (ラ♯)
  
  // 中段（白鍵）- C4からC5まで
  'q': 60,  // C4 (ド)
  'w': 62,  // D4 (レ)
  'e': 64,  // E4 (ミ)
  'r': 65,  // F4 (ファ)
  't': 67,  // G4 (ソ)
  'y': 69,  // A4 (ラ)
  'u': 71,  // B4 (シ)
  'i': 72,  // C5 (ド)
  
  // 中段（黒鍵）
  '2': 61,  // C#4 (ド♯)
  '3': 63,  // D#4 (レ♯)
  '5': 66,  // F#4 (ファ♯)
  '6': 68,  // G#4 (ソ♯)
  '7': 70,  // A#4 (ラ♯)
};

// 逆マッピング（MIDIノートからキー名）
export const midiToKeyboard: Record<number, string> = Object.fromEntries(
  Object.entries(keyboardToMidi).map(([key, midi]) => [midi, key])
);