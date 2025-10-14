/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./login.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#f27f0d",
        "background-light": "#f8f7f5",
        "background-dark": "#221910",
      },
      fontFamily: { 
        display: ["Epilogue"] 
      },
    },
  },
  plugins: [],
}

