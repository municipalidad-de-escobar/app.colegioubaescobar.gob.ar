import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Supabase separado — se carga al login, no bloquea la UI
          'supabase': ['@supabase/supabase-js'],
          // PDF — solo cuando el usuario imprime boletines
          'pdf-libs': ['jspdf', 'jspdf-autotable', 'jsbarcode'],
          // Excel — solo cuando el usuario exporta orden de mérito
          'excel-libs': ['xlsx'],
          // React core
          'react-vendor': ['react', 'react-dom'],
        }
      }
    },
    // Subimos el límite del warning a 600kb para evitar ruido en la consola
    chunkSizeWarningLimit: 600,
  }
})