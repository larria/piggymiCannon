import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
const version=JSON.parse(readFileSync(new URL('./package.json',import.meta.url),'utf8')).version;

export default defineConfig(({mode}) => ({
  base: mode === 'pages' ? '/piggymiCannon/' : '/',
  define:{__APP_VERSION__:JSON.stringify(version)},
  plugins: [{
    name:'game-version',
    configureServer(server){server.middlewares.use((req,res,next)=>{
      if(req.url?.split('?')[0].endsWith('/version.json')) {res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({version}));}
      else next();
    });},
    generateBundle(){this.emitFile({type:'asset',fileName:'version.json',source:JSON.stringify({version})});},
  },VitePWA({
    registerType: 'prompt',
    injectRegister: false,
    includeAssets: ['icons/*.png', 'icons/*.svg', 'audio/*.mp3', 'fonts/*.ttf'],
    manifest: {
      id: './',
      name: '咪猪头的疯狂坦克',
      short_name: '咪猪头坦克',
      description: '咪猪头与大猪头爸爸的炮术对决。13 种经典坦克、26 种武器、可破坏地形、独立 AI 难度与最多四人队伍热座。',
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
