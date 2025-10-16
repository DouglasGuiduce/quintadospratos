/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./login.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'media', // Usa prefers-color-scheme para detecção automática
  theme: {
    extend: {
      colors: {
        primary: "#f27f0d",
        "background-light": "#f8f7f5",
        "background-dark": "#221910",
        "text-light": "#1f2937", // gray-800 - texto no modo claro
        "text-dark": "#f9fafb",  // gray-50 - texto no modo escuro
      },
      fontFamily: { 
        display: ["Epilogue"] 
      },
    },
  },
  plugins: [],
}

