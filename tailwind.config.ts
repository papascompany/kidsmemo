import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-pretendard)", "Pretendard", "system-ui", "sans-serif"]
      },
      colors: {
        ink: "#172033",
        muted: "#687385",
        line: "#dfe4ea",
        surface: "#f7f9fb",
        brand: "#1f8f7a",
        coral: "#df6f5b",
        gold: "#d39b25"
      },
      boxShadow: {
        soft: "0 12px 30px rgba(23, 32, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
