import { defineConfig } from 'vite'
import { copyFileSync, existsSync } from 'fs'

export default defineConfig({
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  plugins: [
    {
      name: 'copy-static-files',
      writeBundle() {
        // Copiar login.html
        if (existsSync('login.html')) {
          copyFileSync('login.html', 'dist/login.html')
          console.log('✅ login.html copiado para dist/')
        }
      }
    }
  ]
})
