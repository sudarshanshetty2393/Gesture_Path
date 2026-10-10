import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // sign-engine.html hosts sign recognition in an isolated frame (see src/sign/engine.ts).
      input: { main: 'index.html', signEngine: 'sign-engine.html' },
    },
  },
})
