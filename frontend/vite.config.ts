import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Cho phép đổi cổng backend qua env (mặc định 3000) — tránh xung đột cổng khi
      // dev nhiều app cùng máy. VD: VITE_API_PROXY_TARGET=http://localhost:3001
      '/api': process.env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
      '/socket.io': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
        ws: true,
      },
    },
  },
});
