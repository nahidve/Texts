import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        "light": {
          "primary": "#3390ec",        // Telegram Blue
          "primary-content": "#ffffff",
          "secondary": "#8774e1",      // Telegram Purple/Violet
          "secondary-content": "#ffffff",
          "accent": "#00c73e",         // Telegram Green
          "accent-content": "#ffffff",
          "neutral": "#1c1c1e",
          "neutral-content": "#ffffff",
          "base-100": "#ffffff",       // Main background (white)
          "base-200": "#f4f4f5",       // Secondary background (light gray)
          "base-300": "#e4e4e7",
          "base-content": "#000000",
          "info": "#2481cc",
          "success": "#00c73e",
          "warning": "#e5a910",
          "error": "#ff595a",
        },
        "dark": {
          "primary": "#3390ec",
          "primary-content": "#ffffff",
          "secondary": "#8774e1",
          "secondary-content": "#ffffff",
          "accent": "#00c73e",
          "accent-content": "#ffffff",
          "neutral": "#2c2c2e",
          "neutral-content": "#ffffff",
          "base-100": "#1c1c1d",       // Telegram dark mode background
          "base-200": "#2c2c2e",       // Telegram dark mode secondary background
          "base-300": "#3a3a3c",
          "base-content": "#ffffff",
          "info": "#2481cc",
          "success": "#00c73e",
          "warning": "#e5a910",
          "error": "#ff595a",
        }
      }
    ],
  },
};