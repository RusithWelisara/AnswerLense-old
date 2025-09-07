// src/lib/api.ts
export async function analyzeAnswer(text: string, subject: string) {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, subject })
  });
  if (!res.ok) throw new Error('Failed to analyze');
  return res.json();
}
