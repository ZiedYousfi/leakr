import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import tailwindcss from "@tailwindcss/vite";
import { svelte } from "@sveltejs/vite-plugin-svelte"; // Import Svelte plugin
import path from 'path'; // Import the path module

export default defineConfig({
  plugins: [
    // ...existing plugins...
    svelte(),
    viteStaticCopy({
      targets: [
        {
          src: 'src/manifest.json',
          dest: '.',
        },
        {
          src: 'src/icon.png',
          dest: '.',
        },
        {
          src: 'node_modules/sql.js/dist/sql-wasm.wasm',
          dest: '.',
        },
      ],
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: new URL("src/popup.html", import.meta.url).pathname,
        background: new URL("src/background.ts", import.meta.url).pathname,
      },
      output: {
        entryFileNames: (assetInfo) => {
          if (assetInfo.name === "background") return "background.js";
          if (assetInfo.name === "popup") return "popup.js";
          return "[name].js";
        },
      },
    },
  },
});
