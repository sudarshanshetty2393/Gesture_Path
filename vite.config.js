import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'phone' ? [basicSsl()] : [])],
  build: {
    rollupOptions: {
      // sign-engine.html hosts sign recognition in an isolated frame (see src/sign/engine.ts).
      input: { main: 'index.html', signEngine: 'sign-engine.html' },
    },
  },
  // `npm run dev:phone`: HTTPS on the local network so a phone can use the camera,
  // with API calls proxied to the backend running on this machine.
  ...(mode === 'phone' && {
    server: { host: true, proxy: { '/api': 'http://localhost:5005' } },
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify('') },
  }),
}))
