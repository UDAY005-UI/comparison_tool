const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type Basis = 'row' | 'column';

export interface SessionInfo {
  sessionId: string;
  basis: Basis;
  maxA: number;
  maxB: number;
  keyLabelA: string;
  keyLabelB: string;
}

export interface Mismatch {
  key: string;
  valueA: string;
  serialA: number;
  valueB: string;
  serialB: number;
}

export interface CompareOutput {
  allMatched: boolean;
  message: string;
  labelA: string;
  labelB: string;
  compared: number;
  mismatches: Mismatch[];
  missingInB: { key: string; serialA: number }[];
  missingInA: { key: string; serialB: number }[];
}

export interface RangeItem {
  colA: number;
  colB: number;
  output: CompareOutput;
}

async function parse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message;
    throw new Error(msg || 'Request failed');
  }
  return data as T;
}

export async function createSession(params: {
  fileA: File;
  fileB: File;
  basis: Basis;
  keyA: number;
  keyB: number;
  headerA: number;
  headerB: number;
}): Promise<SessionInfo> {
  const fd = new FormData();
  fd.append('fileA', params.fileA);
  fd.append('fileB', params.fileB);
  fd.append('basis', params.basis);
  fd.append('keyA', String(params.keyA));
  fd.append('keyB', String(params.keyB));
  fd.append('headerA', String(params.headerA));
  fd.append('headerB', String(params.headerB));

  const res = await fetch(`${API_URL}/compare/session`, {
    method: 'POST',
    body: fd,
  });
  return parse<SessionInfo>(res);
}

export async function runCompare(params: {
  sessionId: string;
  colA: number;
  colB: number;
}): Promise<CompareOutput> {
  const res = await fetch(`${API_URL}/compare/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return parse<CompareOutput>(res);
}

export async function runCompareRange(params: {
  sessionId: string;
  startA: number;
  endA: number;
  startB: number;
  endB: number;
}): Promise<RangeItem[]> {
  const res = await fetch(`${API_URL}/compare/run-range`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return parse<RangeItem[]>(res);
}