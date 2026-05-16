import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/trustindex.io-proxy': {
        target: 'https://cdn.trustindex.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/trustindex\.io-proxy/, ''),
        headers: {
          Referer: 'https://drivepneu.fr/'
        }
      }
    }
  }
})
