export type Delimiter = ',' | ';' | '\t';

export interface CsvRecord {
  cells: string[];
  /** 1-based source line number where the record starts. */
  line: number;
}

export interface ParsedCsv {
  delimiter: Delimiter;
  /** Records of raw cells, header first. Blank lines are skipped. */
  records: CsvRecord[];
}

const CANDIDATES: readonly Delimiter[] = [',', ';', '\t'];

function isDelimiter(char: string): char is Delimiter {
  return (CANDIDATES as readonly string[]).includes(char);
}

/** Picks the delimiter that appears most often (outside quotes) in the first line. Ties prefer `,`. */
export function detectDelimiter(text: string): Delimiter {
  const counts: Record<Delimiter, number> = { ',': 0, ';': 0, '\t': 0 };
  let inQuotes = false;
  for (const char of text) {
    if (char === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (char === '\n' || char === '\r')) break;
    else if (!inQuotes && isDelimiter(char)) counts[char]++;
  }
  let best: Delimiter = ',';
  for (const candidate of CANDIDATES) {
    if (counts[candidate] > counts[best]) best = candidate;
  }
  return best;
}

/** RFC 4180 parser: quoted fields, escaped quotes (""), embedded delimiters and line breaks. */
export function parseCsv(input: string): ParsedCsv {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const delimiter = detectDelimiter(text);
  const records: CsvRecord[] = [];

  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let line = 1;
  let rowStart = 1;

  const endRow = () => {
    row.push(cell);
    cell = '';
    if (row.some((value) => value.trim() !== '')) {
      records.push({ cells: row, line: rowStart });
    }
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (char === '\n') line++;
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      endRow();
      line++;
      rowStart = line;
    } else {
      cell += char;
    }
  }
  if (cell !== '' || row.length > 0) endRow();

  return { delimiter, records };
}
