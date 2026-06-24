/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF9F6",
        ink: "#18181B",
        muted: "#71717A",
        line: "#E8E5DE",
        accent: "#4F46E5",
        valid: "#047857",
        revoked: "#B45309",
      },
      fontFamily: {
        serif: ['"Fraunces"', "Georgia", "serif"],
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(24,24,27,0.04), 0 8px 24px -12px rgba(24,24,27,0.12)",
      },
      keyframes: {
        rise: { "0%": { opacity: 0, transform: "translateY(8px)" }, "100%": { opacity: 1, transform: "translateY(0)" } },
      },
      animation: { rise: "rise .35s cubic-bezier(.2,.8,.2,1) both" },
    },
  },
  plugins: [],
};
