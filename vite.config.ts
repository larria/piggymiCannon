import {RELEASE_NOTES} from './src/release-notes';
import {assetIntegrityPlugin} from './scripts/asset-integrity-plugin.mjs';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import {createHash} from 'node:crypto';
const version=JSON.parse(readFileSync(new URL('./package.json',import.meta.url),'utf8')).version;
// A changed portrait must not silently ship with an old validation/cache key.
const portraitSource=readFileSync(new URL('./src/portrait-assets.ts',import.meta.url),'utf8');
const portraits=JSON.parse(portraitSource.slice(portraitSource.indexOf('{'),portraitSource.lastIndexOf('}')+1));
for(const spec of Object.values(portraits) as {file:string;bytes:number;width:number;height:number;sha256:string;revision:string}[]){
 const bytes=readFileSync(new URL('./public/'+spec.file,import.meta.url));
 if(bytes.length!==spec.bytes||bytes.readUInt32BE(16)!==spec.width||bytes.readUInt32BE(20)!==spec.height||createHash('sha256').update(bytes).digest('hex')!==spec.sha256||createHash('md5').update(bytes).digest('hex')!==spec.revision)throw Error('头像清单与原图不一致：'+spec.file);
}


export default defineConfig(({mode}) => ({
  base: mode === 'pages' ? '/piggymiCannon/' : '/',
  define:{__APP_VERSION__:JSON.stringify(version)},
  plugins: [assetIntegrityPlugin(version),{
    name:'game-version',
    configureServer(server){server.middlewares.use((req,res,next)=>{
      if(req.url?.split('?')[0].endsWith('/version.json')) {res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({version,notes:RELEASE_NOTES}));}
      else next();
    });},
    generateBundle(){const source=JSON.stringify({version,notes:RELEASE_NOTES});this.emitFile({type:'asset',fileName:'version.json',source});this.emitFile({type:'asset',fileName:'release-notes.json',source});},
  },VitePWA({
    registerType: 'prompt',
    injectRegister: false,
    manifest: {
      id: './',
      name: '咪猪头的疯狂坦克',
      short_name: '咪猪头坦克',
      description: '咪猪头与大猪头的炮术对决。13 种经典坦克、26 种武器、可破坏地形、四槽位自由组队、四面队旗、独立 AI 难度与本地热座。',
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
      importScripts: ['audio-range.js'],
      manifestTransforms:[async entries=>({manifest:entries.map(entry=>({...entry,integrity:'sha256-'+createHash('sha256').update(readFileSync(new URL('./dist/'+entry.url,import.meta.url))).digest('base64')})),warnings:[]})],
      globPatterns: ['**/*.{js,css,html,png,svg,mp3,ttf,webmanifest}','asset-integrity.json','release-notes.json'],
      // Include the longest complete BGM; the separate total-size gate remains 90 MB.
      maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      navigateFallbackDenylist: [/^\/api\//],
    },
    devOptions: {enabled:false},
  })],
}));
