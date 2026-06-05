/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    // Proxy `/api/*` from the frontend (:3001) to the backend (:3002) so the
    // whole app is reachable from a single origin — handy for tunnelling
    // through ngrok / cloudflared with one URL and no CORS gymnastics.
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3502/api/:path*',
      },
    ];
  },
};

export default nextConfig;
