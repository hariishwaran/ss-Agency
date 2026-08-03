import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const isProd = mode === 'production';
  return {
    plugins: [react(), tailwindcss()],
    define: {
      ...(env.GEMINI_API_KEY ? { 'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY) } : {}),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    esbuild: false,
    build: {
      target: 'es2022',
      sourcemap: isProd ? false : 'inline',
      minify: 'esbuild',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-motion': ['motion'],
            'vendor-export': ['pptxgenjs', 'xlsx'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-date': ['date-fns', 'react-datepicker'],
          },
        },
      },
    },
  };
});
