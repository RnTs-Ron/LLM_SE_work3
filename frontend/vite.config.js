import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    open: true,
    proxy: {
      '/functions': {
        target: 'https://ttugkbtifehhcymgndvo.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/functions/, '/functions')
      }
    }
  },
  publicDir: '../public'
})