import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
  // 5175 keeps it clear of the main site (5173) and the launch page (5174)
  server: { port: 5175, open: true },
})
