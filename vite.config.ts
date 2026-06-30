import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// React + PWA(manifest / Service Worker 自動生成)。
// /api を FastAPI(127.0.0.1:8000)へプロキシ。dev(npm run dev)と
// 本番ビルドのローカル確認(npm run preview = インストール可能なPWA)の両方で有効。
// 宛先は 127.0.0.1 固定(localhost にすると Node 17+ が IPv6 ::1 を先に引き、
// IPv4 のみにバインドする uvicorn へ繋がらず ECONNREFUSED → ログインが 500 で失敗する)。
const apiProxy = { '/api': 'http://127.0.0.1:8000' };

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'DietSupport',
        short_name: 'DietSupport',
        description: '食事・運動・体重を、ラクに続ける健康記録 PWA',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
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
