import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Fallback to process.env for Vercel deployment (loadEnv only reads .env files)
    const geminiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
    const geminiBaseUrl = env.GEMINI_BASE_URL || process.env.GEMINI_BASE_URL || '';
    const geminiModel = env.GEMINI_MODEL || process.env.GEMINI_MODEL || '';
    const geminiImageModel = env.GEMINI_IMAGE_MODEL || process.env.GEMINI_IMAGE_MODEL || '';
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(geminiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
        'process.env.GEMINI_BASE_URL': JSON.stringify(geminiBaseUrl),
        'process.env.GEMINI_MODEL': JSON.stringify(geminiModel),
        'process.env.GEMINI_IMAGE_MODEL': JSON.stringify(geminiImageModel)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
