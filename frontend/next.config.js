/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/rfi",
  async rewrites() {
    return [
      {
        source: "/rfi-api/:path*",
        destination: "http://backend:8000/api/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
