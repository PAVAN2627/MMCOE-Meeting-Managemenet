import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(217, 91%, 35%)", // Deep Blue
          foreground: "hsl(0, 0%, 100%)",
          light: "hsl(217, 91%, 45%)",
        },
        secondary: {
          DEFAULT: "hsl(220, 13%, 69%)", // Soft Gray
          foreground: "hsl(217, 91%, 35%)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(220, 13%, 91%)",
          foreground: "hsl(220, 9%, 46%)",
        },
        accent: {
          DEFAULT: "hsl(174, 72%, 56%)", // Accent Teal
          foreground: "hsl(217, 91%, 35%)",
          light: "hsl(174, 72%, 66%)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(0, 0%, 100%)",
          foreground: "hsl(217, 33%, 17%)",
        },
        teal: {
          DEFAULT: "hsl(174, 72%, 56%)",
          light: "hsl(174, 72%, 66%)",
        },
        "deep-blue": {
          DEFAULT: "hsl(217, 91%, 35%)",
          light: "hsl(217, 91%, 45%)",
        },
        sidebar: {
          DEFAULT: "hsl(217, 91%, 35%)",
          foreground: "hsl(0, 0%, 100%)",
          primary: "hsl(174, 72%, 56%)",
          "primary-foreground": "hsl(217, 91%, 35%)",
          accent: "hsl(174, 72%, 56%)",
          "accent-foreground": "hsl(217, 91%, 35%)",
          border: "hsl(217, 91%, 45%)",
          ring: "hsl(174, 72%, 56%)",
          muted: "hsl(217, 91%, 45%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        "card-hover": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        "float": "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
