/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hyper: {
          bg: '#090d16',
          card: '#0f172a',
          border: '#1e293b',
          blue: '#38bdf8',
          cyan: '#22d3ee',
          green: '#10b981',
          amber: '#f59e0b',
          red: '#ef4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px -5px rgba(56, 189, 248, 0.3)',
        'glow-green': '0 0 20px -5px rgba(16, 185, 129, 0.3)',
        'glow-amber': '0 0 20px -5px rgba(245, 158, 11, 0.3)',
        'glow-red': '0 0 20px -5px rgba(239, 68, 68, 0.3)',
      }
    },
  },
  plugins: [],
}
