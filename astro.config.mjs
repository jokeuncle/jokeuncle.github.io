import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://jokeuncle.github.io",
  base: "/",
  outDir: "./dist-astro",
  build: {
    assets: "assets",
  },
  integrations: [],
});
