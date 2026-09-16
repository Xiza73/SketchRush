import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5174,
    // Refuse to start rather than quietly moving to 5175. The default fallback
    // leaves an older server still answering on 5174 with the module graph it
    // had when it started, so the browser keeps running code that no longer
    // exists on disk — and every symptom points at the source instead.
    strictPort: true,
  },
});
