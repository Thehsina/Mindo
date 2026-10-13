import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { processSamMessage } from './server/samBackend.js'

function samDevServerPlugin(env) {
  return {
    name: 'sam-dev-server',
    configureServer(server) {
      server.middlewares.use('/api/sam', async (req, res, next) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }));
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;

            const result = await processSamMessage({
              message: parsed.message,
              chatHistory: parsed.chatHistory,
              context: parsed.context,
              apiKey,
            });

            res.statusCode = result.error ? (result.error === 'MISSING_API_KEY' ? 503 : 500) : 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (err) {
            console.error('[Vite Sam Middleware Error]:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'SERVER_ERROR', message: "Sorry, I couldn't process that right now. Please try again." }));
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), samDevServerPlugin(env)],
  };
});
