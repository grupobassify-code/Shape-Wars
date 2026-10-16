/**
 * Shape Wars - Express Server & Full-Stack Proxy Entry
 * Mounts Vite middleware in development and provides server-side Gemini AI endpoints.
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API route: AI Match Tactical Briefing
app.post('/api/match-briefing', async (req, res) => {
  try {
    const { playerHero, rivalHeroes, mode } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Actúa como un estratega táctico de eSports para el juego de arena Shape Wars (estilo Brawl Stars).
El jugador controla a: ${playerHero || 'Pulsar'}.
Rivales enfrente: ${Array.isArray(rivalHeroes) ? rivalHeroes.join(', ') : 'Rival'}.
Modo de juego: ${mode || 'Noqueo 3v3'}.
Proporciona un consejo táctico conciso y motivador de máximo 2 oraciones directas en español. Enfócate en cómo contrarrestar a los rivales o ganar en este modo. No uses asteriscos ni markdown.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    res.json({ briefing: response.text });
  } catch (error: any) {
    console.error('Error generating AI match briefing:', error);
    res.status(500).json({ error: 'Failed to generate briefing' });
  }
});

// Serve static assets directly (ensures images always load in dev & prod)
app.use('/src/assets', express.static('src/assets'));
app.use('/assets', express.static('public/assets'));
app.use(express.static('public'));

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.use(express.static('public'));
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
