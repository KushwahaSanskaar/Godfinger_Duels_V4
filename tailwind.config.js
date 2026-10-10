/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0F0F1A',
        p1: '#3A8EF6',
        'p1-alt': '#1748A1',
        'p1-alt2': '#77B2FF',
        p2: '#E63946',
        'p2-alt': '#972934',
        'p2-alt2': '#FF6C77',
        accent: '#7B5EA7',
        event: '#F5C518',
        banned: '#2A2A3A',
        unavailable: '#1D1D2E',
        'text-primary': '#ccccdd',
        'text-muted': '#555577',
      },
      fontFamily: {
        pixel: ["Silkscreen", "monospace"],
        lexend: ["Lexend", "sans-serif"],
        sans: ["TheSansMonoSCd", "monospace"]
      },
    },
  },
  plugins: [],
}