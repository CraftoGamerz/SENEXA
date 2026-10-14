import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {readFile,writeFile,readdir} from 'node:fs/promises';
export default defineConfig({plugins:[react(),{name:'senexa-offline-manifest',async closeBundle(){const assets=await readdir('dist/assets');const worker=await readFile('dist/sw.js','utf8');await writeFile('dist/sw.js',`const PRECACHE=${JSON.stringify(['./','./index.html','./favicon.svg',...assets.map(a=>'./assets/'+a)])};\n`+worker);}}],base:'./',build:{rollupOptions:{output:{manualChunks:{firebase:['firebase/app','firebase/auth','firebase/firestore'],charts:['recharts']}}}},server:{port:5173,strictPort:true}});
