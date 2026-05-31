import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@c_chat/ui',
    '@c_chat/shared-api',
    '@c_chat/shared-config',
    '@c_chat/shared-protobuf',
    '@c_chat/shared-types',
    '@c_chat/shared-utils',
  ],
};

export default nextConfig;
