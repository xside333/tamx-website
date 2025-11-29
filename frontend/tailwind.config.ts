import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
    "./client/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
      },
      screens: {
        "2xl": "1512px",
      },
    },
    extend: {
      colors: {
        // Using CSS variables for consistency with tokens
        accent: "var(--color-accent)",
        surface: {
          DEFAULT: "var(--color-surface)",
          secondary: "var(--color-surface-secondary)",
        },
        muted: "var(--color-muted)",
        border: {
          DEFAULT: "var(--color-border)",
          light: "var(--color-border-light)",
        },
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
          disabled: "var(--color-text-disabled)",
          onAccent: "var(--color-text-on-accent)",
        },
        status: {
          rate35: "var(--color-status-rate-3-5)",
          rate5Plus: "var(--color-status-rate-5-plus)",
          rate03: "var(--color-status-rate-0-3)",
          error: "var(--color-status-error)",
          success: "var(--color-status-success)",
        },
        background: "var(--color-bg)",
        foreground: "var(--color-text-primary)",
        // Legacy colors for compatibility with existing components
        primary: {
          DEFAULT: "var(--color-accent)",
          foreground: "var(--color-text-on-accent)",
        },
        secondary: {
          DEFAULT: "var(--color-surface-secondary)",
          foreground: "var(--color-text-primary)",
        },
        destructive: {
          DEFAULT: "var(--color-status-error)",
          foreground: "var(--color-text-on-accent)",
        },
        card: {
          DEFAULT: "var(--color-surface)",
          foreground: "var(--color-text-primary)",
        },
        popover: {
          DEFAULT: "var(--color-surface)",
          foreground: "var(--color-text-primary)",
        },
        input: "var(--color-surface-secondary)",
        ring: "var(--color-accent)",
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        "3xl": "var(--radius-3xl)",
      },
      fontFamily: {
        sans: ["var(--font-family)"],
      },
      fontSize: {
        xs: "var(--font-size-xs)",
        sm: "var(--font-size-sm)",
        base: "var(--font-size-base)",
        lg: "var(--font-size-lg)",
        xl: "var(--font-size-xl)",
        "2xl": "var(--font-size-2xl)",
      },
      fontWeight: {
        normal: "var(--font-weight-normal)",
        medium: "var(--font-weight-medium)",
        bold: "var(--font-weight-bold)",
      },
      lineHeight: {
        tight: "var(--line-height-tight)",
        normal: "var(--line-height-normal)",
        relaxed: "var(--line-height-relaxed)",
      },
      spacing: {
        "1": "var(--space-1)",
        "2": "var(--space-2)",
        "3": "var(--space-3)",
        "4": "var(--space-4)",
        "5": "var(--space-5)",
        "6": "var(--space-6)",
        "8": "var(--space-8)",
        "12": "var(--space-12)",
        "16": "var(--space-16)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      zIndex: {
        dropdown: "var(--z-dropdown)",
        sticky: "var(--z-sticky)",
        modal: "var(--z-modal)",
        popover: "var(--z-popover)",
        tooltip: "var(--z-tooltip)",
      },
      transitionDuration: {
        fast: "var(--anim-fast)",
        normal: "var(--anim-normal)",
        slow: "var(--anim-slow)",
      },
      transitionTimingFunction: {
        standard: "var(--easing-standard)",
        emphasized: "var(--easing-emphasized)",
      },
      screens: {
        mobile: { max: "550px" },
        tablet: { min: "551px", max: "1023px" },
        desktop: { min: "1024px" },
        "1.2xl": "1300px", // Для скрытия кнопки "Наш подход"
        "1.35xl": "1350px", // Доп. брейкпоинт для 4 колонок
        "1.4xl": "1400px", // Для скрытия кнопки "Опции"
        "1.6xl": "1500px", // Для скрытия текста соцсетей
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
        skeleton: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        floating: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        skeleton: "skeleton 1.5s linear infinite",
        floating: "floating 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
