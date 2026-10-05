import vinext from "vinext";
import { defineConfig } from "vite";
export default defineConfig(async () => {
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    publicDir: "../assets/public",
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        // nombre, base D1 y variables están en wrangler.jsonc
        configPath: "./wrangler.jsonc",
      }),
    ],
  };
});
