import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import tailwindcss from "@tailwindcss/vite";
import { svelte } from "@sveltejs/vite-plugin-svelte"; // Import Svelte plugin
import path from "path"; // Import the path module

export default defineConfig({
  plugins: [
    tailwindcss(),
    svelte(),
    viteStaticCopy({
      targets: [
        {
          src: "src/manifest.json",
          dest: ".",
          // Optional: Add transform if you need to modify manifest content during copy
          // transform(content) {
          //   const manifest = JSON.parse(content.toString());
          //   // Example modification: Ensure paths are relative to dist root
          //   manifest.action.default_popup = 'popup.html';
          //   manifest.options_page = 'options.html';
          //   manifest.background.service_worker = 'background.js';
          //   return JSON.stringify(manifest, null, 2);
          // }
        },
        {
          src: "src/icon.png",
          dest: ".",
        },
        {
          src: "node_modules/sql.js/dist/sql-wasm.wasm",
          dest: ".",
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: new URL("src/popup.html", import.meta.url).pathname,
        background: new URL("src/background.ts", import.meta.url).pathname,
        options: new URL("src/options/options.html", import.meta.url).pathname,
      },
      output: {
        entryFileNames: (assetInfo) => {
          if (assetInfo.name === "background") return "background.js";
          if (assetInfo.name === "popup") return "popup.js";
          if (assetInfo.name === "options") return "options.js";
          return "[name].js";
        },
        // Ensure HTML files are output at the root and chunks are named predictably
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
      external: ["$app/navigation"],
    },
  },
});
