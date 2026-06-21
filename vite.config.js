import { defineConfig } from 'vite'

export default defineConfig({
  base: '/franciscoortu-o/',
  build: { outDir: 'docs' },
  plugins: [
    {
      name: 'strip-crossorigin',
      transformIndexHtml(html) {
        return html.replaceAll('crossorigin', '')
      },
    },
  ],
})
