import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/app",
        permanent: false
      },
      {
        source: "/calendar",
        destination: "/app#calendar",
        permanent: false
      },
      {
        source: "/coupons",
        destination: "/app#coupons",
        permanent: false
      },
      {
        source: "/ai-helper",
        destination: "/app#ai-helper",
        permanent: false
      }
    ];
  },
  turbopack: {
    root: __dirname
  }
};

export default nextConfig;
