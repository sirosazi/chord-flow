// コード検出ユーティリティ

interface ChordInfo {
  name: string;
  intervals: string[];
  fullName: string;
}

// MIDIノート番号から音名を取得
export function midiNoteToNoteName(midiNote: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = noteNames[midiNote % 12];
  return `${noteName}${octave}`;
}

// 音名から半音数を取得（Cを0とする）
function noteNameToSemitone(noteName: string): number {
  const noteMap: { [key: string]: number } = {
    'C': 0, 'C#': 1, 'Db': 1,
    'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4,
    'F': 5, 'F#': 6, 'Gb': 6,
    'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10,
    'B': 11
  };
  return noteMap[noteName] || 0;
}

// コード定義（インターバルパターン）
// 基本的なコードのみを定義
const chordPatterns: { [key: string]: { intervals: number[], displayIntervals: string[], suffix: string } } = {
  // Major chords
  'major': { intervals: [0, 4, 7], displayIntervals: ['1', '3', '5'], suffix: 'M' },
  'major7': { intervals: [0, 4, 7, 11], displayIntervals: ['1', '3', '5', '7'], suffix: 'maj7' },
  'major6': { intervals: [0, 4, 7, 9], displayIntervals: ['1', '3', '5', '6'], suffix: '6' },
  
  // Minor chords
  'minor': { intervals: [0, 3, 7], displayIntervals: ['1', 'b3', '5'], suffix: 'm' },
  'minor7': { intervals: [0, 3, 7, 10], displayIntervals: ['1', 'b3', '5', 'b7'], suffix: 'm7' },
  'minor6': { intervals: [0, 3, 7, 9], displayIntervals: ['1', 'b3', '5', '6'], suffix: 'm6' },
  
  // Dominant chords
  'dominant7': { intervals: [0, 4, 7, 10], displayIntervals: ['1', '3', '5', 'b7'], suffix: '7' },
  'dominant9': { intervals: [0, 4, 7, 10, 14], displayIntervals: ['1', '3', '5', 'b7', '9'], suffix: '9' },
  
  // Add9 chords
  'add9': { intervals: [0, 4, 7, 14], displayIntervals: ['1', '3', '5', '9'], suffix: 'add9' },
  'minoradd9': { intervals: [0, 3, 7, 14], displayIntervals: ['1', 'b3', '5', '9'], suffix: 'madd9' },
  
  // Diminished chords
  'diminished': { intervals: [0, 3, 6], displayIntervals: ['1', 'b3', 'b5'], suffix: 'dim' },
  'diminished7': { intervals: [0, 3, 6, 9], displayIntervals: ['1', 'b3', 'b5', 'bb7'], suffix: 'dim7' },
  'halfDiminished': { intervals: [0, 3, 6, 10], displayIntervals: ['1', 'b3', 'b5', 'b7'], suffix: 'm7b5' },
  
  // Augmented chords
  'augmented': { intervals: [0, 4, 8], displayIntervals: ['1', '3', '#5'], suffix: 'aug' },
  
  // Suspended chords
  'sus2': { intervals: [0, 2, 7], displayIntervals: ['1', '2', '5'], suffix: 'sus2' },
  'sus4': { intervals: [0, 5, 7], displayIntervals: ['1', '4', '5'], suffix: 'sus4' },
};

// 押されているノートからコードを検出
export function detectChord(pressedNotes: number[]): ChordInfo {
  if (pressedNotes.length === 0) {
    return {
      name: '',
      intervals: [],
      fullName: 'Play some notes...'
    };
  }

  if (pressedNotes.length === 1) {
    const noteName = midiNoteToNoteName(pressedNotes[0]).slice(0, -1); // オクターブ番号を削除
    return {
      name: '',  // 単音の場合は表示しない
      intervals: ['1'],
      fullName: noteName
    };
  }

  // ★ 重複を除去し、オクターブを正規化（すべて0-11の範囲にマッピング）
  const uniquePitchClasses = [...new Set(pressedNotes.map(note => note % 12))];
  
  if (uniquePitchClasses.length < 2) {
    // 同じ音のオクターブ違いのみの場合
    const noteName = midiNoteToNoteName(pressedNotes[0]).slice(0, -1);
    return {
      name: '',
      intervals: ['1'],
      fullName: noteName
    };
  }
  
  // ノートをソートして正規化
  const sortedNotes = [...pressedNotes].sort((a, b) => a - b);
  const rootNote = sortedNotes[0];
  const rootNoteName = midiNoteToNoteName(rootNote).slice(0, -1);
  
  // インターバルを計算（ルートノートからの半音数）- 重複除去済み
  const intervals = [...new Set(sortedNotes.map(note => (note - rootNote) % 12))].sort((a, b) => a - b);
  
  // 各ルート音を試す（転回形に対応）
  for (let i = 0; i < sortedNotes.length; i++) {
    const testRoot = sortedNotes[i];
    const testRootName = midiNoteToNoteName(testRoot).slice(0, -1);
    // 重複を除去してインターバルを計算
    const testIntervals = [...new Set(sortedNotes.map(note => (note - testRoot) % 12))].sort((a, b) => a - b);
    
    // コードパターンとマッチングを試みる
    for (const [chordType, pattern] of Object.entries(chordPatterns)) {
      if (arraysEqual(testIntervals, pattern.intervals)) {
        return {
          name: `${testRootName}${pattern.suffix}`,
          intervals: pattern.displayIntervals,
          fullName: `${testRootName} ${chordType.replace(/([A-Z])/g, ' $1').trim()}`
        };
      }
    }
  }

  // マッチするコードが見つからない場合は表示しない
  return {
    name: '',  // 基本コード以外は表示しない
    intervals: [],
    fullName: 'Unknown chord'
  };
}

// 配列の比較ヘルパー
function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// 音符の位置を五線譜上の位置に変換（Musical Staff用）
export function midiNoteToStaffPosition(midiNote: number): number {
  // C4 (MIDI 60) を基準位置5とする
  // 半音ごとに0.5ずつ増加
  return ((midiNote - 60) * 0.5) + 5;
}

// コード名から構成音（MIDIノート）を生成
export function chordNameToNotes(chordName: string, octave: number = 4): number[] {
  // ルート音を抽出
  let rootName = '';
  let suffix = '';
  
  if (chordName.length > 1 && (chordName[1] === '#' || chordName[1] === 'b')) {
    rootName = chordName.slice(0, 2);
    suffix = chordName.slice(2);
  } else {
    rootName = chordName[0];
    suffix = chordName.slice(1);
  }
  
  // ルート音のMIDI番号を計算
  const noteMap: { [key: string]: number } = {
    'C': 0, 'C#': 1, 'Db': 1,
    'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4,
    'F': 5, 'F#': 6, 'Gb': 6,
    'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10,
    'B': 11
  };
  
  const rootMidi = (octave + 1) * 12 + (noteMap[rootName] || 0);
  
  // サフィックスからインターバルを決定
  let intervals: number[] = [0, 4, 7]; // デフォルトはメジャー
  
  if (suffix === 'm' || suffix === 'min') {
    intervals = [0, 3, 7]; // マイナー
  } else if (suffix === 'm7') {
    intervals = [0, 3, 7, 10]; // マイナー7th
  } else if (suffix === 'maj7') {
    intervals = [0, 4, 7, 11]; // メジャー7th
  } else if (suffix === '7') {
    intervals = [0, 4, 7, 10]; // ドミナント7th
  } else if (suffix === 'dim') {
    intervals = [0, 3, 6]; // ディミニッシュ
  } else if (suffix === 'aug') {
    intervals = [0, 4, 8]; // オーギュメント
  } else if (suffix === 'sus2') {
    intervals = [0, 2, 7]; // サスペンド2
  } else if (suffix === 'sus4') {
    intervals = [0, 5, 7]; // サスペンド4
  } else if (suffix === '6') {
    intervals = [0, 4, 7, 9]; // 6th
  } else if (suffix === 'm6') {
    intervals = [0, 3, 7, 9]; // マイナー6th
  }
  
  return intervals.map(interval => rootMidi + interval);
}