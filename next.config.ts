import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  turbopack: {
    rules: {
      // This loader also matches "*.module.css" and reclassifies those files as
      // plain CSS, which silently empties their class exports. Do not use CSS
      // Modules in this project: ship global stylesheets with prefixed classes
      // (see src/templates/onyx/onyx.css and src/components/preview/preview.css).
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
