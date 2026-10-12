import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        home: "index.html",
        one: "1d/index.html",
        two: "2d/index.html",
        three: "3d/index.html",
        project: "work/dimensional-portfolio.html",
        now: "work/now.html",
        notes: "work/notes.html",
      },
    },
  },
});
