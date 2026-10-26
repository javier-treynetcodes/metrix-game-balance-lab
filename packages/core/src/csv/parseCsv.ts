/**
 * @file RFC 4180 CSV parser with delimiter detection and quote error reporting.
 */

/** Column separators Métrix detects: comma, semicolon (common in Spanish/German spreadsheets) and tab. */
export type Delimiter = ',' | ';' | '\t';

/** One row of the file as raw text cells, before any interpretation. */
export interface CsvRecord {
  cells: string[];
  /** 1-based source line number where the record starts. */
  line: number;
}

/** Quote problems that break the row structure of the file. */
export interface CsvSyntaxError {
  code: 'unclosed-quote' | 'stray-quote';
  /** 1-based line: where the unclosed value starts, or where the stray quote is. */
  line: number;
}

/** Result of `parseCsv`: the detected delimiter, the rows and any quote problems found. */
export interface ParsedCsv {
  delimiter: Delimiter;
  /** Records of raw cells, header first. Blank lines are skipped. */
  records: CsvRecord[];
  syntaxErrors: CsvSyntaxError[];
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
  const syntaxErrors: CsvSyntaxError[] = [];

  let row: string[] = [];
  let cell = '';
  /**
   * State of the cell being read:
   * - `start`: nothing read yet in this cell.
   * - `plain`: reading an unquoted value.
   * - `quoted`: inside a value wrapped in double quotes (delimiters and line breaks are literal).
   * - `closed`: right after the closing quote; only a delimiter or a line break may follow.
   */
  let field: 'start' | 'plain' | 'quoted' | 'closed' = 'start';
  let line = 1;
  let rowStart = 1;
  let quoteStart = 1;

  const endCell = () => {
    row.push(cell);
    cell = '';
    field = 'start';
  };
  const endRow = () => {
    endCell();
    if (row.some((value) => value.trim() !== '')) {
      records.push({ cells: row, line: rowStart });
    }
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (field === 'quoted') {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          field = 'closed';
        }
      } else {
        if (char === '\n') line++;
        cell += char;
      }
    } else if (char === delimiter) {
      endCell();
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      endRow();
      line++;
      rowStart = line;
    } else if (char === '"' && field === 'start') {
      field = 'quoted';
      quoteStart = line;
    } else {
      if (char === '"' || field === 'closed') syntaxErrors.push({ code: 'stray-quote', line });
      field = 'plain';
      cell += char;
    }
  }
  if (field === 'quoted') syntaxErrors.push({ code: 'unclosed-quote', line: quoteStart });
  if (field !== 'start' || row.length > 0) endRow();

  return { delimiter, records, syntaxErrors };
}
