import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#102028",
        slateblue: "#29556b",
        mint: "#d9eee8",
        clinical: "#f4f8f7",
        line: "#d8e3e1",
        action: "#0f766e"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(16, 32, 40, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
