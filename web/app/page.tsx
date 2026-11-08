'use client';

import { useState } from 'react';
import {
  Basis,
  RangeItem,
  SessionInfo,
  createSession,
  runCompare,
  runCompareRange,
} from '../lib/api';

type Mode = 'single' | 'range';

interface HistoryItem {
  id: number;
  results: RangeItem[];
}

const field: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  marginBottom: 12,
};

const input: React.CSSProperties = {
  padding: 8,
  border: '1px solid #ccc',
  borderRadius: 6,
};

const button: React.CSSProperties = {
  padding: '8px 16px',
  border: 'none',
  borderRadius: 6,
  background: '#111',
  color: '#fff',
  cursor: 'pointer',
};

const cell: React.CSSProperties = {
  border: '1px solid #ddd',
  padding: '6px 10px',
  textAlign: 'left',
};

const pair: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
};

export default function Page() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [basis, setBasis] = useState<Basis>('column');
  const [headerA, setHeaderA] = useState('1');
  const [headerB, setHeaderB] = useState('1');
  const [keyA, setKeyA] = useState('');
  const [keyB, setKeyB] = useState('');
  const [session, setSession] = useState<SessionInfo | null>(null);

  const [mode, setMode] = useState<Mode>('single');
  const [colA, setColA] = useState('');
  const [colB, setColB] = useState('');
  const [startA, setStartA] = useState('');
  const [endA, setEndA] = useState('');
  const [startB, setStartB] = useState('');
  const [endB, setEndB] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const unit = basis === 'column' ? 'column' : 'row';
  const headerUnit = basis === 'column' ? 'row' : 'column';

  const startSession = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setError('');

    if (!fileA || !fileB) {
      setError('Select both files');
      return;
    }
    if (!keyA || !keyB) {
      setError(`Enter the key ${unit} number for both files`);
      return;
    }
    if (!headerA || !headerB) {
      setError(`Enter the heading ${headerUnit} number for both files`);
      return;
    }

    setLoading(true);
    try {
      const info = await createSession({
        fileA,
        fileB,
        basis,
        keyA: Number(keyA),
        keyB: Number(keyB),
        headerA: Number(headerA),
        headerB: Number(headerB),
      });
      setSession(info);
      setHistory([]);
      setColA('');
      setColB('');
      setStartA('');
      setEndA('');
      setStartB('');
      setEndB('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const compare = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!session) return;
    setError('');

    setLoading(true);
    try {
      let results: RangeItem[];

      if (mode === 'single') {
        if (!colA || !colB) {
          setError(`Enter the ${unit} number for both files`);
          return;
        }
        const output = await runCompare({
          sessionId: session.sessionId,
          colA: Number(colA),
          colB: Number(colB),
        });
        results = [{ colA: Number(colA), colB: Number(colB), output }];
      } else {
        if (!startA || !endA || !startB || !endB) {
          setError(`Enter the ${unit} range for both files`);
          return;
        }
        results = await runCompareRange({
          sessionId: session.sessionId,
          startA: Number(startA),
          endA: Number(endA),
          startB: Number(startB),
          endB: Number(endB),
        });
      }

      setHistory((h) => [{ id: Date.now(), results }, ...h]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSession(null);
    setHistory([]);
    setFileA(null);
    setFileB(null);
    setHeaderA('1');
    setHeaderB('1');
    setKeyA('');
    setKeyB('');
    setColA('');
    setColB('');
    setStartA('');
    setEndA('');
    setStartB('');
    setEndB('');
    setMode('single');
    setError('');
  };

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h1>Excel Compare</h1>

      {!session && (
        <section>
          <div style={field}>
            <label>File A</label>
            <input
              style={input}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFileA(e.target.files?.[0] ?? null)}
            />
          </div>

          <div style={field}>
            <label>File B</label>
            <input
              style={input}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFileB(e.target.files?.[0] ?? null)}
            />
          </div>

          <div style={field}>
            <label>Comparison basis</label>
            <select
              style={input}
              value={basis}
              onChange={(e) => setBasis(e.target.value as Basis)}
            >
              <option value="column">Column</option>
              <option value="row">Row</option>
            </select>
          </div>

          <div style={field}>
            <label>File A heading {headerUnit} number</label>
            <input
              style={input}
              type="number"
              min={1}
              value={headerA}
              onChange={(e) => setHeaderA(e.target.value)}
            />
          </div>

          <div style={field}>
            <label>File B heading {headerUnit} number</label>
            <input
              style={input}
              type="number"
              min={1}
              value={headerB}
              onChange={(e) => setHeaderB(e.target.value)}
            />
          </div>

          <div style={field}>
            <label>File A key {unit} number</label>
            <input
              style={input}
              type="number"
              min={1}
              value={keyA}
              onChange={(e) => setKeyA(e.target.value)}
            />
          </div>

          <div style={field}>
            <label>File B key {unit} number</label>
            <input
              style={input}
              type="number"
              min={1}
              value={keyB}
              onChange={(e) => setKeyB(e.target.value)}
            />
          </div>

          <button style={button} onClick={startSession} disabled={loading}>
            {loading ? 'Loading...' : 'Continue'}
          </button>
        </section>
      )}

      {session && (
        <section>
          <p>
            Key {unit}: <b>{session.keyLabelA || keyA}</b> (File A) ↔{' '}
            <b>{session.keyLabelB || keyB}</b> (File B). File A has{' '}
            {session.maxA} {unit}s, File B has {session.maxB} {unit}s.
          </p>

          <div style={field}>
            <label>Comparison range</label>
            <select
              style={input}
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
            >
              <option value="single">Single {unit}</option>
              <option value="range">Range of {unit}s</option>
            </select>
          </div>

          {mode === 'single' && (
            <>
              <div style={field}>
                <label>File A {unit} number to compare</label>
                <input
                  style={input}
                  type="number"
                  min={1}
                  value={colA}
                  onChange={(e) => setColA(e.target.value)}
                />
              </div>

              <div style={field}>
                <label>File B {unit} number to compare</label>
                <input
                  style={input}
                  type="number"
                  min={1}
                  value={colB}
                  onChange={(e) => setColB(e.target.value)}
                />
              </div>
            </>
          )}

          {mode === 'range' && (
            <>
              <div style={pair}>
                <div style={field}>
                  <label>File A {unit} from</label>
                  <input
                    style={input}
                    type="number"
                    min={1}
                    value={startA}
                    onChange={(e) => setStartA(e.target.value)}
                  />
                </div>
                <div style={field}>
                  <label>File A {unit} to</label>
                  <input
                    style={input}
                    type="number"
                    min={1}
                    value={endA}
                    onChange={(e) => setEndA(e.target.value)}
                  />
                </div>
              </div>

              <div style={pair}>
                <div style={field}>
                  <label>File B {unit} from</label>
                  <input
                    style={input}
                    type="number"
                    min={1}
                    value={startB}
                    onChange={(e) => setStartB(e.target.value)}
                  />
                </div>
                <div style={field}>
                  <label>File B {unit} to</label>
                  <input
                    style={input}
                    type="number"
                    min={1}
                    value={endB}
                    onChange={(e) => setEndB(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button style={button} onClick={compare} disabled={loading}>
              {loading ? 'Comparing...' : 'Compare'}
            </button>
            <button
              style={{ ...button, background: '#666' }}
              onClick={reset}
              disabled={loading}
            >
              Start over
            </button>
          </div>
        </section>
      )}

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {history.map((h) => (
        <div key={h.id} style={{ marginTop: 24 }}>
          {h.results.map((r) => (
            <section
              key={`${h.id}-${r.colA}-${r.colB}`}
              style={{
                marginBottom: 16,
                padding: 16,
                border: '1px solid #ddd',
                borderRadius: 8,
              }}
            >
              <h3 style={{ marginTop: 0 }}>
                {unit} {r.colA}
                {r.output.labelA ? ` (${r.output.labelA})` : ''} vs {unit}{' '}
                {r.colB}
                {r.output.labelB ? ` (${r.output.labelB})` : ''}
              </h3>

              <p style={{ color: r.output.allMatched ? 'green' : 'crimson' }}>
                {r.output.message} ({r.output.compared} compared)
              </p>

              {r.output.mismatches.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={cell}>{session?.keyLabelA || 'Key'}</th>
                        <th style={cell}>{r.output.labelA || 'File A'}</th>
                        <th style={cell}>{r.output.labelB || 'File B'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.output.mismatches.map((m, i) => (
                        <tr key={i}>
                          <td style={cell}>{m.key}</td>
                          <td style={cell}>{m.valueA}</td>
                          <td style={cell}>{m.valueB}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {r.output.missingInB.length > 0 && (
                <p>
                  Keys in File A not found in File B:{' '}
                  {r.output.missingInB.map((m) => m.key).join(', ')}
                </p>
              )}

              {r.output.missingInA.length > 0 && (
                <p>
                  Keys in File B not found in File A:{' '}
                  {r.output.missingInA.map((m) => m.key).join(', ')}
                </p>
              )}
            </section>
          ))}
        </div>
      ))}
    </main>
  );
}