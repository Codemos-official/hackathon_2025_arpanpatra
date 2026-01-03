import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vite Configuration for InsightCast
 * 
 * Critical Configuration Notes:
 * 
 * 1. WASM Asset Handling:
 *    Transformers.js v3 handles WASM loading internally via CDN or bundled assets.
 *    No manual WASM copying needed - the library fetches required files automatically.
 * 
 * 2. Worker Configuration:
 *    Workers must be built as ES modules to support dynamic imports and top-level await.
 *    The `format: 'es'` option ensures compatibility with modern browsers.
 * 
 * 3. optimizeDeps.exclude:
 *    We exclude @huggingface/transformers from pre-bundling because it contains
 *    WebAssembly modules that Vite's optimizer can't handle correctly.
 * 
 * 4. Headers:
 *    SharedArrayBuffer requires Cross-Origin-Isolation. We set the necessary
 *    COOP and COEP headers for proper WebGPU and WASM multithreading support.
 */
export default defineConfig({
  plugins: [
    react(),
  ],
  
  // Required for proper WASM and SharedArrayBuffer support
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  
  // Same headers for preview builds
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },

  // Worker build configuration
  worker: {
    format: 'es',
    plugins: () => []
  },

  // Optimization settings for AI libraries
  optimizeDeps: {
    exclude: ['@huggingface/transformers']
  },

  // Build configuration
  build: {
    target: 'esnext',
  },

  // Resolve aliases for cleaner imports
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
