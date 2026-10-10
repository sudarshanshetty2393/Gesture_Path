import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      // sign-engine.html hosts sign recognition in an isolated frame (see src/sign/engine.ts).
      input: { main: 'index.html', signEngine: 'sign-engine.html' },
    },
  },
});
