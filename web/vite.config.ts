import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Sem API_URL o front fala com o mock do Prism (npm run mock), que serve as rotas sem o prefixo /api/v1.
// Com API_URL=http://localhost:3000 fala com o back-end real.
const apiUrl = process.env.API_URL

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': apiUrl
        ? { target: apiUrl, changeOrigin: true }
        : { target: 'http://localhost:4010', rewrite: (caminho) => caminho.replace(/^\/api\/v1/, '') },
    },
  },
})
