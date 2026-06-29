import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// React + PWA(manifest / Service Worker 自動生成)。
// /api を FastAPI(localhost:8000)へプロキシ。dev(npm run dev)と
// 本番ビルドのローカル確認(npm run preview = インストール可能なPWA)の両方で有効。
const apiProxy = { '/api': 'http://localhost:8000' };

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'DietSupport',
        short_name: 'DietSupport',
        description: '食事・運動・体重を、ラクに続ける健康記録 PWA',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: apiProxy,
  },
  preview: {
    port: 4173,
    proxy: apiProxy,
  },
});
