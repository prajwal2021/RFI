import type { Config } from "tailwindcss";


// Brand palette, used 60 / 30 / 10:
//   sand beige (60%)  page backgrounds, surfaces, borders and neutral text (replaces gray/slate)
//   forest green (30%) headers, primary buttons, links, headings (replaces blue/indigo/sky)
//   electric purple (10%) highlights only: main call-to-action, active tab, badges, focus rings (replaces violet/purple)
const sand = { 50: "#fbf8f2", 100: "#f5efe3", 200: "#ebe2d0", 300: "#dccfb5", 400: "#b8aa8c", 500: "#7f7562", 600: "#665d4e", 700: "#4f483d", 800: "#36322a", 900: "#24211c", 950: "#161411" };
const forest = { 50: "#eef5f0", 100: "#d7e9dd", 200: "#b0d3bd", 300: "#80b797", 400: "#4f9670", 500: "#2f7a54", 600: "#226444", 700: "#1b5038", 800: "#163f2d", 900: "#113224", 950: "#0a1f16" };
const volt = { 50: "#f6f0ff", 100: "#ece0ff", 200: "#d9c2ff", 300: "#bd94ff", 400: "#a366ff", 500: "#8f3dff", 600: "#7c1fff", 700: "#6a12e6", 800: "#5711b8", 900: "#461192", 950: "#2b0662" };

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(36,33,28,0.04), 0 4px 16px -4px rgba(36,33,28,0.08)",
        lift: "0 2px 4px rgba(36,33,28,0.05), 0 12px 32px -8px rgba(36,33,28,0.16)",
      },
      colors: {
        sand, forest, volt,
        gray: sand, slate: sand, zinc: sand, neutral: sand, stone: sand,
        blue: forest, indigo: forest, sky: forest, cyan: forest,
        violet: volt, purple: volt,
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
export default config;
