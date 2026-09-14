import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // server.proxy is not used: Vite proxy only works locally and is unavailable on Vercel.
  // API origin comes from VITE_API_URL in src/shared/api/client.ts.
})
