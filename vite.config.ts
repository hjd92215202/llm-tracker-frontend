import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }

          const parts = id.split('node_modules/')[1]?.split('/') ?? []
          const packageName = parts[0]?.startsWith('@') ? `${parts[0]}-${parts[1]}` : parts[0]

          if (!packageName) {
            return 'vendor'
          }

          if (
            packageName.startsWith('@vue-devtools') ||
            ['perfect-debounce', 'hookable', 'birpc'].includes(packageName)
          ) {
            return
          }

          if (id.includes('md-editor-v3') || id.includes('katex') || id.includes('mermaid') || id.includes('prismjs')) {
            return 'editor-vendor'
          }

          if (id.includes('@vue-flow')) {
            return 'flow-vendor'
          }

          if (id.includes('axios') || id.includes('pinia') || id.includes('vue-router')) {
            return 'app-vendor'
          }

          if (packageName === 'vue' || packageName.startsWith('@vue')) {
            return 'vue-vendor'
          }

          return `vendor-${packageName.replace(/[^a-zA-Z0-9_-]/g, '-')}`
        },
      },
    },
  },
})
