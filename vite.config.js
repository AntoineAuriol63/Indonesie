import { defineConfig } from 'vite';

// base relative : le site fonctionne quel que soit le sous-dossier où il est hébergé (GitHub Pages, etc.).
export default defineConfig({
  base: './',
  // Cible volontairement large pour que le site démarre aussi sur des navigateurs de quelques années.
  build: { target: 'es2020', chunkSizeWarningLimit: 900 },
});
