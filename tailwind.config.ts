import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-pretendard)", "Pretendard Variable", "Pretendard", "system-ui", "sans-serif"]
      },
      colors: {
        ink: "#27332d",
        muted: "#65736c",
        line: "#dbe3dc",
        surface: "#f6f7f2",
        brand: "#4e8a70",
        coral: "#d97968",
        gold: "#c99538"
      },
      boxShadow: {
        soft: "0 14px 32px rgba(52, 71, 61, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
