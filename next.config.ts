import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // GitHub Pages only serves static files. Cloudflare keeps the optional
  // shared-score API, while this flag exports the practice interface as HTML.
  ...(process.env.GITHUB_PAGES === "1" ? { output: "export", trailingSlash: true } : {}),
};

export default nextConfig;
