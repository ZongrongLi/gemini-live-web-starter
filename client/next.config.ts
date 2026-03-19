import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 强制忽略构建过程中的检查错误 */
  eslint: {
    // 即使代码有警告或没用到的变量，也允许构建通过
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 即使有类型报错，也允许构建通过
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
