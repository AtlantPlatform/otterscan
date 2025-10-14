import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { imagetools } from "vite-imagetools";
import viteCompression from "vite-plugin-compression";

// Proxy to local API server during development
const proxyTarget = process.env.VITE_API_URL || 'http://localhost:3001'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteCompression(),
    viteCompression({ algorithm: "brotliCompress" }),
    imagetools(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate React and core libraries
          'vendor-react': ['react', 'react-dom', 'react-router', 'react-error-boundary'],
          // Separate ethers (large blockchain library)
          'vendor-ethers': ['ethers'],
          // UI libraries
          'vendor-ui': ['@headlessui/react', '@tanstack/react-query', 'swr'],
          // Chart libraries (only needed on specific pages)
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          // QR/Camera scanner (large, only needed for specific feature)
          'vendor-scanner': ['@zxing/browser', '@zxing/library'],
          // Code highlighting (large, only needed on contract pages)
          'vendor-shiki': ['shiki'],
          // FontAwesome icons
          'vendor-icons': [
            '@fortawesome/fontawesome-svg-core',
            '@fortawesome/free-brands-svg-icons',
            '@fortawesome/free-regular-svg-icons',
            '@fortawesome/free-solid-svg-icons',
            '@fortawesome/react-fontawesome'
          ],
        },
      },
    },
    // Increase chunk size warning limit since we're splitting properly
    chunkSizeWarningLimit: 600,
  },
  server: {
    proxy: {
      '^/api': {
        target: proxyTarget,
        ws: false,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
});
