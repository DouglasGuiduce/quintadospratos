import { defineConfig } from 'vite'
import { copyFileSync, existsSync } from 'fs'

export default defineConfig({
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: './index.html',
        login: './login.html'
      },
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
        // Não copiar login.html - deixar o Vite processar
        console.log('✅ Arquivos processados pelo Vite')
      }
    }
  ]
})
