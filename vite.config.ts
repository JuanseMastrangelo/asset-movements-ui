import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: '/',
  preview: {
    allowedHosts: ['s4g08o8sw808cwgwc4c8k8cs.147.93.13.112.sslip.io', 'lucas.programadoresargentina.com', 'aw0o04ocsgko0w4osgo0040k.147.93.13.112.sslip.io' , 'lucas-sandbox.programadoresargentina.com'],
  },
});
