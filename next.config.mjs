/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // ネイティブバイナリをサーバー外部扱いにする（保険）
    serverComponentsExternalPackages: ['@napi-rs/canvas'],
  },
  webpack: (config) => {
    // 念のためバンドルから除外
    config.externals = config.externals || [];
    config.externals.push('@napi-rs/canvas');
    return config;
  },
};

export default nextConfig;
