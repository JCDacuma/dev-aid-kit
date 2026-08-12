import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/toolbox",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
