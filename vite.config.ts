import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/vip-drinks/' : '/',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    open: true,
  },
})
