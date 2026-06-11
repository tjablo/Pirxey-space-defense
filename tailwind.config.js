/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#060411",
        parchment: "#f9f9ea",
        ember: "#d74721",
        plasma: "#ffcf65",
        orbit: "#5aa6bd",
        graphite: "#11101a"
      },
      fontFamily: {
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
        body: ["Fira Sans", "Inter", "system-ui", "sans-serif"]
      },
      boxShadow: {
        "hud": "0 20px 80px rgba(0, 0, 0, 0.35)"
      }
    }
  },
  plugins: []
};
