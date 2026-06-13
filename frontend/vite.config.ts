import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/docs': {
        target: 'http://docs:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
