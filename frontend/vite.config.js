import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        timeout: 600000,
        proxyTimeout: 600000,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('Proxy error:', err.message)
          })
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setTimeout(600000)
          })
        }
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser'
  }
})
