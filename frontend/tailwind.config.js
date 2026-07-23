/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        zen: {
          dark: '#08080a',       // Dark Charcoal
          panel: '#0f0f12',      // Dark Card
          panelLight: '#16161c', // Lighter Card
          emerald: '#dfb94d',    // Gold
          lavender: '#f2cc60',   // Hover Gold
          blue: '#d4af37',       // Accent Gold
          rose: '#ef4444',       // Critical Red
          textMuted: '#8b8b93'   // Warm Slate Muted
        },
        brand: {
          bg: '#F5F1EB',
          card: '#EDE8E0',
          cardLight: '#E4DFD6',
          gold: '#4A7265',
          goldHover: '#3D5E53',
          goldMuted: '#B5C9C2',
          text: '#221C13',
          textMuted: '#7A7060',
          border: 'rgba(34, 28, 19, 0.12)',
          borderLight: 'rgba(34, 28, 19, 0.06)'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
        'glass-hover': '0 8px 32px 0 rgba(223, 185, 77, 0.05)',
      }
    },
  },
  plugins: [],
}
