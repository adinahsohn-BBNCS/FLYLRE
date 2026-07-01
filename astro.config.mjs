import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://www.flylre.com",
  server: {
    port: 4321,
  },
  preview: {
    port: 4321,
  },
});
