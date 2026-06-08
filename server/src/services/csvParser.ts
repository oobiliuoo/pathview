import { parse } from 'csv-parse/sync';

export interface CsvParseResult {
  columns: string[];
  rows: Record<string, string>[];
  hasHeader: boolean;
  rawPreview: string[][];
  totalColumns: number;
}

export function parseCsvRaw(buffer: Buffer): string[][] {
  let content = buffer.toString('utf-8');
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return parse(content, {
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });
}

export function detectHeader(firstRow: string[]): boolean {
  // A header row likely contains non-numeric values
  const nonNumeric = firstRow.filter((v) => v !== '' && isNaN(Number(v)));
  return nonNumeric.length > firstRow.length * 0.5;
}

export function parseCsv(buffer: Buffer, headerRow: number = 0): CsvParseResult {
  const rawRows = parseCsvRaw(buffer);
  if (rawRows.length === 0) {
    return { columns: [], rows: [], hasHeader: false, rawPreview: [], totalColumns: 0 };
  }

  const previewRows = rawRows.slice(0, 5);
  const totalColumns = rawRows[0]?.length ?? 0;
  const hasHeader = headerRow >= 0 && headerRow < rawRows.length;

  let columns: string[];
  let dataRows: string[][];

  if (hasHeader) {
    columns = rawRows[headerRow];
    dataRows = rawRows.slice(headerRow + 1);
  } else {
    columns = Array.from({ length: totalColumns }, (_, i) => `Column ${i + 1}`);
    dataRows = rawRows;
  }

  const rows: Record<string, string>[] = dataRows.map((row) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < columns.length; i++) {
      obj[columns[i]] = row[i] ?? '';
    }
    return obj;
  });

  return { columns, rows, hasHeader, rawPreview: previewRows, totalColumns };
}