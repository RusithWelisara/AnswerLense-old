// src/App.tsx
import { useState } from 'react';
import { analyzeAnswer } from './lib/api';

type Mistake = {
  type: 'knowledge' | 'logic' | 'writing' | 'format' | string;
  what: string;
  why: string;
  fix: string;
};

export default function App() {
  const [text, setText] = useState('');
  const [subject, setSubject] = useState('general');
  const [loading, setLoading] = useState(false);
  const [overall, setOverall] = useState('');
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [scoreHint, setScoreHint] = useState<number | null>(null);
  const [error, setError] = useState('');

  const run = async () => {
    setError('');
    setLoading(true);
    setOverall('');
    setMistakes([]);
    setScoreHint(null);
    try {
      const data = await analyzeAnswer(text, subject);
      setOverall(data.overall || '');
      setMistakes(Array.isArray(data.mistakes) ? data.mistakes : []);
      setScoreHint(typeof data.scoreHint10 === 'number' ? data.scoreHint10 : null);
    } catch (e: any) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-blue-600" />
          <h1 className="text-2xl font-bold">AnswerLense</h1>
        </div>
        <p className="mt-2 text-slate-600">
          Paste your exam answer. Get instant AI feedback on mistakes & how to fix them.
        </p>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-24">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <label className="mb-2 block text-sm font-medium">Subject (optional)</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., chemistry, history, math"
              className="mb-4 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
            />
            <label className="mb-2 block text-sm font-medium">Your Answer</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your exam answer here..."
              className="h-64 w-full resize-none rounded-xl border px-3 py-2 outline-none focus:ring"
            />
            <button
              onClick={run}
              disabled={loading || !text.trim()}
              className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
            >
              {loading ? 'Analyzing…' : 'Analyze Answer'}
            </button>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <p className="mt-3 text-xs text-slate-500">
              *MVP note: text-only for now. Image/PDF upload comes next.
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h3 className="text-lg font-semibold">Feedback</h3>
            {!overall && !loading && (
              <p className="mt-2 text-slate-500">Run an analysis to see feedback here.</p>
            )}
            {overall && (
              <div className="mt-3 rounded-xl border bg-slate-50 p-3">
                <p className="text-sm">{overall}</p>
                {typeof scoreHint === 'number' && (
                  <p className="mt-2 text-xs text-slate-500">Score hint (out of 10): {scoreHint}</p>
                )}
              </div>
            )}
            {mistakes.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-semibold">Mistakes & Fixes</h4>
                <ul className="space-y-3">
                  {mistakes.map((m, i) => (
                    <li key={i} className="rounded-xl border p-3">
                      <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                        {m.type}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">What:</span> {m.what}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Why:</span> {m.why}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Fix:</span> {m.fix}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
