import { defineConfig } from 'vite';

// base relative : le site fonctionne quel que soit le sous-dossier où il est hébergé (GitHub Pages, etc.).
export default defineConfig({
  base: './',
  build: {
    // Cible volontairement large pour que le site démarre aussi sur des navigateurs de quelques années.
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    // Deux pages : le site (index.html) et le back office (admin/index.html).
    rolldownOptions: { input: { main: 'index.html', admin: 'admin/index.html' } },
  },
});
