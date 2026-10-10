import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The icon catalogue carries its version in its file name, so it can be kept
   * for good — `public/` is otherwise served `max-age=0`.
   */
  headers() {
    return [
      {
        source: "/icons/:file*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
