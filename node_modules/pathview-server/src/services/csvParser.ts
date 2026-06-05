import { parse } from 'csv-parse/sync';

export interface CsvParseResult {
  columns: string[];
  rows: Record<string, string>[];
}

export function parseCsv(buffer: Buffer): CsvParseResult {
  const records = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  const columns = Object.keys(records[0] || {});
  return { columns, rows: records };
}
