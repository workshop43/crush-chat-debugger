import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // 使用相对路径，便于部署到 GitHub Pages 等子路径环境
  base: './',
  plugins: [tailwindcss()],
  server: {
    port: 5177,
    strictPort: true,
  },
});
