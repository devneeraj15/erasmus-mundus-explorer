import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: isGithubPages ? "export" : undefined,
  basePath: isGithubPages ? "/erasmus-mundus-explorer" : undefined,
  images: {
    unoptimized: true,
  },
  trailingSlash: isGithubPages,
};

export default nextConfig;
