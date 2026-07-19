import { defineConfig } from "vite";

function katexWoff2Only() {
  return {
    name: "katex-woff2-only",
    enforce: "pre",
    transform(source, id) {
      const normalizedId = id.replaceAll("\\", "/");
      if (!normalizedId.endsWith("/katex/dist/katex.min.css")) return null;

      return source.replace(
        /,url\(fonts\/[^)]*\.woff\) format\("woff"\),url\(fonts\/[^)]*\.ttf\) format\("truetype"\)/g,
        "",
      );
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [katexWoff2Only()],
  build: {
    outDir: "dist-desktop",
    emptyOutDir: true,
    target: "es2020",
    sourcemap: false,
  },
});
