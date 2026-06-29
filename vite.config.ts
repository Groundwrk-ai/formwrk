import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the build works at both the GitHub Pages project URL
  // (username.github.io/<repo>/) and at a custom-domain root. The app has no
  // client-side router, so relative asset paths are safe.
  base: './',
  plugins: [react()],
})
