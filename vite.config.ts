import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { pwaPlugin } from './scripts/pwa-plugin.ts'
import { readBuildInfo } from './scripts/build-info.ts'

export default defineConfig(({mode})=>{
  const build=readBuildInfo(import.meta.dirname)
  return {
    base: mode==='github-pages'?'/aqua-canvas-trainer/':'/',
    define: { __APP_BUILD__: JSON.stringify(build) },
    plugins: [react(),pwaPlugin(build)],
  }
})
