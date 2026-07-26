import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. Without this, Next.js may pick up an
  // unrelated lockfile in a parent directory (a warning was shown at build).
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    // Server Actions and route handlers import these; keep them on the server.
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
