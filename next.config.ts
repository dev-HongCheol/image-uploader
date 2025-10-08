import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "coin-images.coingecko.com",
        pathname: "/**",
      },
    ],
  },
  // Webpack 설정: 서버 전용 패키지 최적화
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 서버 사이드에서만 사용되는 패키지는 번들링하지 않음
      config.externals = config.externals || [];
      config.externals.push({
        'heic-convert': 'commonjs heic-convert',
        'libheif-js': 'commonjs libheif-js',
        'sharp': 'commonjs sharp',
      });
    } else {
      // 클라이언트 사이드에서는 해당 패키지를 사용하지 않음
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // 큰 문자열 직렬화 경고 무시
    config.ignoreWarnings = [
      { module: /libheif-js/ },
      /Serializing big strings/,
    ];

    return config;
  },
  // Server-side 전용 패키지 번들링 제외 (Next.js 15+)
  serverExternalPackages: ['sharp', 'heic-convert', 'libheif-js'],
};

export default nextConfig;
