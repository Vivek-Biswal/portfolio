import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { contentServerPlugin } from "./server/vite-plugin.mjs";
export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key,value] of Object.entries(env)) {
    if (/^(FIREBASE_|GOOGLE_|SITE_ORIGIN)/.test(key)) process.env[key] = value;
  }
  return {
    plugins:[contentServerPlugin(),react()],
    build:{rollupOptions:{input:{home:"index.html",one:"1d/index.html",two:"2d/index.html",three:"3d/index.html",project:"work/dimensional-portfolio.html",now:"work/now.html",notes:"work/notes.html",adminLogin:"admin/login/index.html",adminDashboard:"admin/dashboard/index.html"}}},
  };
});
