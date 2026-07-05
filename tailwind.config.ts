import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#050505",
        ink: "#0b0b0c",
        fog: "#f2f1ee",
        smoke: "#8d8d93",
        hairline: "rgba(255,255,255,0.10)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      zIndex: {
        scene: "0",
        veil: "20",
        detail: "30",
        chrome: "40",
        loader: "50",
        cursor: "60",
      },
    },
  },
  plugins: [],
};

export default config;
