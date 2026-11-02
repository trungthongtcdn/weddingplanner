import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ứng dụng gần như toàn bộ là dữ liệu theo phiên đăng nhập, nên dùng mô hình render động
  // truyền thống thay vì Cache Components.
  serverExternalPackages: ["@libsql/client", "libsql", "exceljs"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
