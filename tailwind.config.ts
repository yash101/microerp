import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        paper: "#f7f8f5",
        moss: "#4d6b53",
        rust: "#a6532a",
        plum: "#6f4c7c"
      }
    }
  },
  plugins: []
};

export default config;
