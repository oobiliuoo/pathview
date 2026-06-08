import { parse } from 'csv-parse/sync';

export interface CsvParseResult {
  columns: string[];
  rows: Record<string, string>[];
}

export function parseCsv(buffer: Buffer): CsvParseResult {
  let content = buffer.toString('utf-8');
  // Remove BOM header if present (common in Excel-exported CSVs)
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  if (records.length === 0) {
    return { columns: [], rows: [] };
  }

  const columns = Object.keys(records[0]);
  return { columns, rows: records };
}