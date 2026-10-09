import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { pwaPlugin } from './scripts/pwa-plugin.ts'

export default defineConfig(({mode})=>({
  base: mode==='github-pages'?'/aqua-canvas-trainer/':'/',
  plugins: [react(),pwaPlugin()],
}))
