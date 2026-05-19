import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolveBackendOrigin } from './src/services/backend-endpoints.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const backendOrigin = resolveBackendOrigin({
    viteApiUrl: env.VITE_API_URL,
    viteBackendOrigin: env.VITE_BACKEND_ORIGIN,
    fallbackOrigin: 'http://localhost:3000',
  })

  return {
    plugins: [
      react(),
    ],
    server: {
      proxy: {
        '/api': {
          target: backendOrigin,
          changeOrigin: true,
          secure: false,
        },
        '/commandes': {
          target: backendOrigin,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/socket.io': {
          target: backendOrigin,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
  }
})
