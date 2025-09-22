import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    config.resolve = config.resolve ?? {};
    config.resolve.alias = config.resolve.alias ?? {};
    config.resolve.alias['@'] = path.resolve(__dirname);

    return config;
  },
};

export default nextConfig;
