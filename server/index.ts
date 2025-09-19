// server/index.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple, structured exam-answer analysis prompt
const SYSTEM_PROMPT = `
You are AnswerLense, a strict but supportive exam answer reviewer.
Return JSON only with this shape:
{
  "overall": string,
  "mistakes": [{ "type": "knowledge|logic|writing|format", "what": string, "why": string, "fix": string }],
  "scoreHint10": number
}
Be concise and honest.
`;

app.post('/api/analyze', async (req, res) => {
  try {
    const { text, subject = 'general' } = req.body as { text: string; subject?: string };

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Missing text' });
    }

    const userPrompt = `
Subject: ${subject}
Student Answer:
"""
${text.slice(0, 6000)}
"""
Analyze as per the JSON schema. No extra prose, no markdown, just valid JSON.
`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini', // cheap + good
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
    });

    const raw = response.choices?.[0]?.message?.content ?? '{}';

    // Try to parse JSON safely
    let data: any = {};
    try { data = JSON.parse(raw); }
    catch {
      // Fallback: ask model to fix to valid JSON
      const fix = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Return valid JSON only. No markdown.' },
          { role: 'user', content: `Fix this to valid JSON: ${raw}` }
        ],
        temperature: 0
      });
      data = JSON.parse(fix.choices?.[0]?.message?.content ?? '{}');
    }

    res.json(data);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`AnswerLense API running on :${PORT}`));
