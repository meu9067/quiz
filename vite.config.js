const { defineConfig } = require('vite');

module.exports = defineConfig({
  publicDir: false,
  build: {
    outDir: 'public/js',
    emptyOutDir: true,
    lib: {
      entry: 'src/js/main-entry.js',
      formats: ['es'],
      fileName: () => 'bundle.js',
    },
  },
});
