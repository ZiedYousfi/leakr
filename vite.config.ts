import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: "src/manifest.json",
          dest: ".",
        },
        {
          src: "src/icon.png",
          dest: ".",
        },
      ],
    }),
    tailwindcss(),
  ],
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
