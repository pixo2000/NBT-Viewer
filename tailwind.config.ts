import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        minecraft: {
          dirt: "#866043",
          grass: "#5D8A3C",
          stone: "#8A8A8A",
          wood: "#9C7A3C",
          diamond: "#5ECFCF",
          gold: "#FAEE4D",
          iron: "#D3C4B4",
          emerald: "#17DD62",
          netherite: "#4B4046",
          redstone: "#E32A2A",
        },
      },
      fontFamily: {
        minecraft: ["'Press Start 2P'", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
