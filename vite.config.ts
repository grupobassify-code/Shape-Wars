import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { GoogleGenAI } from '@google/genai';

function apiPlugin(): Plugin {
  return {
    name: 'api-server',
    configureServer(server) {
      server.middlewares.use('/api/match-briefing', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const data = body ? JSON.parse(body) : {};
            const { playerHero, rivalHeroes, mode } = data;
            const apiKey = process.env.GEMINI_API_KEY;

            if (!apiKey) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                briefing: 'Mantén el movimiento constante, usa los arbustos para emboscadas y coordina con tu equipo.'
              }));
              return;
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

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ briefing: response.text }));
          } catch (err) {
            console.error('API Error:', err);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              briefing: 'Aprovecha las coberturas y desata tu Súper en el momento decisivo para ganar la ronda.'
            }));
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
