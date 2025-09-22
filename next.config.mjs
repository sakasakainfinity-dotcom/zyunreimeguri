/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // ← ここが肝。ネイティブバイナリを外部扱いにする
    serverComponentsExternalPackages: ['@napi-rs/canvas'],
  },
  webpack: (config) => {
    // 予防線：バンドル対象から外す（念のため）
    config.externals = config.externals || [];
    config.externals.push('@napi-rs/canvas');
    return config;
  },
};

// ESM なので export default
export default nextConfig;
