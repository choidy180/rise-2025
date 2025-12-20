// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    styledComponents: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "1.254.24.170",
        port: "24828",
        pathname: "/images/**",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // ✅ Permissions-Policy: 자동재생/스피커 선택 전면 허용 (가장 관대한 문법)
          {
            key: "Permissions-Policy",
            value: "autoplay=*, speaker-selection=*",
          },
          // (선택) 구형/중간 프록시 호환용 — 무해하므로 같이 내려도 됨
          {
            key: "Feature-Policy",
            value: "autoplay *; speaker-selection *",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
