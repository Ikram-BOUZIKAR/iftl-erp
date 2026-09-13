import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    outDir: mode === 'demo' ? 'dist-demo' : 'dist',
  },
  resolve: {
    alias: mode === 'demo' ? [
      // Swap real IFTL data for synthetic demo data in demo builds.
      // Regex must match the WHOLE specifier so String.replace replaces it fully.
      {
        find: /^.*\/portailData$/,
        replacement: resolve(__dirname, 'src/data/portailData.demo.js'),
      },
      {
        find: /^.*\/seedData$/,
        replacement: resolve(__dirname, 'src/data/seedData.demo.js'),
      },
    ] : [],
  },
}))
