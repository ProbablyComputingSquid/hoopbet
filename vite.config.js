import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // forward API calls to Express backend running on localhost:4000
      '/register': 'http://localhost:4000',
      '/users': 'http://localhost:4000',
      '/users.json': 'http://localhost:4000',
      '/markets': 'http://localhost:4000'
    }
  }
})
