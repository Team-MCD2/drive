import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://c-chez-toit.com',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  compressHTML: true,
  vite: {
    build: {
      cssMinify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': ['jquery'],
          },
        },
      },
    },
  },
});
