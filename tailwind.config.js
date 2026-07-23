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
          bg: '#E7E9F3',            // Comfortable slate-grey with soft purple tint
          card: '#F3F5FA',          // Soft light grey-lavender card surface (no pure white glare)
          surface: '#DDE2EF',       // Slightly darker grey-purple for sidebars/inputs
          accent: '#7038F8',        // Elegant deep royal purple
          accentSoft: '#EAE6FF',    // Soft lavender/purple bg tint
          accentDark: '#521ED6',    // Darker purple for button hovers
          warm: '#E06A48',          // Softer warm coral
          warmSoft: '#FDEEE9',      // Softer warm orange bg tint
          mint: '#0D9488',          // Calming teal/mint
          mintSoft: '#CCFBF1',
          text: '#2A2E45',          // Softer charcoal text (no harsh black text)
          textSecondary: '#5A6178',
          textMuted: '#848C9E',
          border: '#CAD0E2',        // Softer grey-purple borders
          borderLight: '#DCE1EE',
          danger: '#EF4444',
          dangerSoft: '#FEE2E2',
          warning: '#F59E0B',
          warningSoft: '#FEF3C7'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'soft': '0 4px 24px rgba(0, 0, 0, 0.05)',
        'soft-md': '0 8px 32px rgba(0, 0, 0, 0.07)',
        'soft-lg': '0 12px 48px rgba(0, 0, 0, 0.08)',
        'accent': '0 4px 20px rgba(108, 99, 255, 0.15)',
        'warm': '0 4px 20px rgba(255, 138, 101, 0.15)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.1)' },
        },
      },
    },
  },
  plugins: [],
}
