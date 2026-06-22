/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Allow manual class gating if needed, default is dark anyway
  theme: {
    extend: {
      colors: {
        industrial: {
          950: '#0b0f19', // Deep dark slate background
          900: '#111827', // Card dark base
          800: '#1f2937', // Section background
          700: '#374151', // Border / Muted elements
          600: '#4b5563', // Text muted
          accent: {
            orange: '#f97316', // Safety orange highlight
            amber: '#f59e0b', // Warning amber
            green: '#10b981', // Operational green
            blue: '#0ea5e9', // Cyberspace blue
            red: '#ef4444' // Emergency stop red
          }
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.4)',
        'glass-glow': '0 0 15px rgba(249, 115, 22, 0.15)',
        'glass-green': '0 0 15px rgba(16, 185, 129, 0.15)',
      }
    },
  },
  plugins: [],
}
