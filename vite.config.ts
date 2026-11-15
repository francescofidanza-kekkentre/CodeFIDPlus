import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'codemirror-vendor': [
            '@uiw/react-codemirror',
            '@codemirror/commands',
            '@codemirror/lang-css',
            '@codemirror/lang-html',
            '@codemirror/lang-javascript',
            '@codemirror/lang-json',
            '@codemirror/lang-markdown',
            '@codemirror/lang-python',
            '@codemirror/search',
            '@codemirror/state',
            '@codemirror/theme-one-dark',
            '@codemirror/view',
          ],
          'icons-vendor': ['lucide-react'],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
