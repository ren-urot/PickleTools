import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import apps from './src/shared/apps.json' with { type: 'json' }

// GitHub Pages project sites live under /<repo>/, so the base is configurable.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        store: resolve(import.meta.dirname, 'index.html'),
        ...Object.fromEntries(apps.map((a) => [a.slug, resolve(import.meta.dirname, `apps/${a.slug}/index.html`)])),
        ...Object.fromEntries(apps.map((a) => [`${a.slug}-demo`, resolve(import.meta.dirname, `demo/${a.slug}/index.html`)])),
      },
    },
  },
  test: {
    environment: 'jsdom',
  },
})
