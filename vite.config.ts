
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Using (process as any).cwd() to handle missing Node types for process
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    // Securely expose specific env vars if absolutely necessary, 
    // but prefer import.meta.env in code.
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      // Firebase keys should be accessed via import.meta.env.VITE_...
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'recharts': ['recharts'],
            'firebase': ['firebase/app', 'firebase/auth', 'firebase/database', 'firebase/firestore'],
            'vendors': ['react', 'react-dom']
          }
        }
      },
      chunkSizeWarningLimit: 800,
      cssCodeSplit: true,
      sourcemap: true,
      minify: 'terser',
    }
  };
});
