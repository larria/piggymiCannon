import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => ({
  base: mode === 'pages' ? '/piggymiCannon/' : '/',
  plugins: [VitePWA({
    registerType: 'prompt',
    injectRegister: false,
    includeAssets: ['icons/*.png', 'audio/*.mp3', 'fonts/*.ttf'],
    manifest: {
      id: './',
      name: '咪猪头的疯狂坦克',
      short_name: '咪猪头坦克',
      description: '咪猪头与大猪头爸爸的炮术对决。可破坏地形、12 种武器、AI 与双人热座。',
      lang: 'zh-CN',
      start_url: './',
      scope: './',
      display: 'standalone',
      display_override: ['fullscreen', 'standalone'],
      orientation: 'landscape',
      theme_color: '#edf0e5',
      background_color: '#f4f2eb',
      icons: [
        {src:'icons/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
        {src:'icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,mp3,ttf,webmanifest}'],
      maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      navigateFallbackDenylist: [/^\/api\//],
    },
    devOptions: {enabled:false},
  })],
}));
