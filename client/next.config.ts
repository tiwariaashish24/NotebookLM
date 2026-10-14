import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const authApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

    return {
      beforeFiles: [
        {
          source: "/api/auth/:path*",
          destination: `${authApiUrl}/api/auth/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
