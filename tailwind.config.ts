import type { Config } from "tailwindcss";

// Tokens cinematográficos: oscuro + dorado
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fondo: "#0a0a0a",
        superficie: "#141414",
        superficieAlt: "#1c1c1c",
        borde: "#262626",
        bordeFuerte: "#3a3a3a",
        acento: "#d4af37",
        acentoHover: "#e6c558",
        acentoOscuro: "#a8861e",
        textoSec: "#a3a3a3",
        textoTerc: "#737373",
        exito: "#16a34a",
        advertencia: "#f59e0b",
        error: "#ef4444",
        // shadcn-compatibles
        background: "#0a0a0a",
        foreground: "#ffffff",
        border: "#262626",
        input: "#1c1c1c",
        ring: "#d4af37",
        primary: { DEFAULT: "#d4af37", foreground: "#0a0a0a" },
        secondary: { DEFAULT: "#262626", foreground: "#ffffff" },
        muted: { DEFAULT: "#1c1c1c", foreground: "#a3a3a3" },
        accent: { DEFAULT: "#1c1c1c", foreground: "#d4af37" },
        destructive: { DEFAULT: "#ef4444", foreground: "#ffffff" },
        card: { DEFAULT: "#141414", foreground: "#ffffff" },
        popover: { DEFAULT: "#141414", foreground: "#ffffff" },
      },
      borderRadius: {
        lg: "0.625rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
