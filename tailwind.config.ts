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
        lav: "#f3f0fb", // page background
        ink: "#1f1a33", // primary text
        grape: "#6d4bd8", // primary purple
        grapeDark: "#5a3cc0", // primary hover
        brandAmber: "#f5b73d", // accent (custom token; avoids shadowing Tailwind's amber scale)
        amberInk: "#3a2c05", // text on amber
        amberDeep: "#a9791a", // amber-toned heading
        muted: "#544f6b", // body copy
        faint: "#8b86a3", // labels, hints
        line: "#e6ddf7", // borders
        line2: "#e0d9f2", // button borders
        hair: "#efeaf7", // hairline dividers
        lilac: "#f5f2fc", // soft purple surface
        cream: "#fdf6e8", // soft amber surface
        field: "#faf8ff", // input fill
        grapeSoft: "#f0ebfb", // grape-tinted pill fill
        okSoft: "#eafaf1", // recruiting pill fill
        okText: "#1c8a54", // recruiting pill text
        infoSoft: "#eef0fb", // not-yet-recruiting pill fill
        infoText: "#4a45c9", // not-yet-recruiting pill text
        neutralSoft: "#f4f2fb", // neutral pill fill
        neutralText: "#7a7594" // neutral pill text
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"]
      },
      boxShadow: {
        nav: "0 6px 18px rgba(109,75,216,.12)",
        btn: "0 16px 32px rgba(109,75,216,.3)",
        card: "0 24px 50px rgba(109,75,216,.1)",
        soft: "0 10px 30px rgba(109,75,216,.07)"
      }
    }
  },
  plugins: []
};

export default config;
