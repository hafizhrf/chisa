import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        // three and gsap change far less often than the app; keep them cached separately.
        codeSplitting: {
          groups: [
            { name: "three", test: /node_modules[\\/]three/ },
            { name: "vendor", test: /node_modules[\\/](gsap|react|react-dom|scheduler)/ },
          ],
        },
      },
    },
  },
  test: { environment: "node" },
});
