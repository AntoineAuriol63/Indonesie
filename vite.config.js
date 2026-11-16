import { defineConfig } from 'vite';

// base relative : le site fonctionne quel que soit le sous-dossier où il est hébergé (GitHub Pages, etc.).
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 900 },
});
