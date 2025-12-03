import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { imagetools } from "vite-imagetools";
import viteCompression from "vite-plugin-compression";

// Proxy to local API server during development
const proxyTarget = process.env.VITE_API_URL || 'http://localhost:3001'

// Manual chunks configuration for client build (not SSR)
const vendorChunks: Record<string, string[]> = {
  'vendor-react': ['react', 'react-dom', 'react-router', 'react-error-boundary'],
  'vendor-ethers': ['ethers'],
  'vendor-ui': ['@headlessui/react', '@tanstack/react-query', 'swr'],
  'vendor-charts': ['chart.js', 'react-chartjs-2'],
  'vendor-scanner': ['@zxing/browser', '@zxing/library'],
  'vendor-shiki': ['shiki'],
  'vendor-icons': [
    '@fortawesome/fontawesome-svg-core',
    '@fortawesome/free-brands-svg-icons',
    '@fortawesome/free-regular-svg-icons',
    '@fortawesome/free-solid-svg-icons',
    '@fortawesome/react-fontawesome'
  ],
};

// https://vitejs.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [
    react(),
    viteCompression(),
    viteCompression({ algorithm: "brotliCompress" }),
    imagetools(),
  ],
  build: {
    rollupOptions: {
      output: {
        // Only use manualChunks for client builds, not SSR
        manualChunks: isSsrBuild ? undefined : vendorChunks,
      },
    },
    // Increase chunk size warning limit since we're splitting properly
    chunkSizeWarningLimit: 600,
    // Enable tree-shaking for better dead code elimination
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
    },
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
  // SSR Configuration
  ssr: {
    // Bundle these packages with SSR build (they need transformation)
    noExternal: [
      'react-helmet-async',
      'use-keyboard-shortcut',  // CJS package that needs bundling
    ],
  },
}));
