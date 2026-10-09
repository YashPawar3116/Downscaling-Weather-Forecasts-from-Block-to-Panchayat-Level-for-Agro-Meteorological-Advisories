import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()], server: { proxy: { '/api': 'http://127.0.0.1:8001', '/agri-api': 'http://127.0.0.1:8001' } }, build: { rollupOptions: { input: { main: resolve(__dirname, 'index.html'), map: resolve(__dirname, 'src/map.html') }, output: { manualChunks(id) { if (id.includes('node_modules/react-leaflet') || id.includes('node_modules/leaflet')) return 'map'; if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'charts'; if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react-vendor' } } } } })
