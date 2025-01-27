import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { imagetools } from "vite-imagetools";
import viteCompression from "vite-plugin-compression";

const proxyTarget = 'https://ethscan.org/erigon/'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteCompression(),
    viteCompression({ algorithm: "brotliCompress" }),
    imagetools(),
  ],
  server: {
    proxy: {
      '^/api': {
        target: proxyTarget,
        ws: true,
        changeOrigin: true,
        autoRewrite: true,
        headers: {
          origin: proxyTarget,
          referer: proxyTarget,
        },
      },
    },
  },
});
