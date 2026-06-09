/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The backend is API-only; pages aren't served. Keep transpilation of the
  // shared workspace so `@shared/*` imports work without a build step.
  transpilePackages: [],
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
