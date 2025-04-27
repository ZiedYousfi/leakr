import { fontFamily as _fontFamily } from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,ts,svelte,css}'],
  theme: {
    extend: {
      colors: {
        'deep-black': '#000000',
        'night-violet': '#7E5BEF',
        'silver-grey': '#B0B0B0',
        'dark-grey': '#4B4B4B',
        'neon-blue': '#00FFFF',
        'pale-pink': '#FFB6C1',
        'off-white': '#E0E0E0',
      },
      fontFamily: {
        sans: ['"Fira Sans"', 'Inter', ..._fontFamily.sans],
        mono: ['"Fira Mono"', ..._fontFamily.mono],
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': {
            opacity: 1,
            boxShadow: '0 0 0 0 rgba(126, 91, 239, 0.7)',
          },
          '50%': {
            opacity: 1,
            boxShadow: '0 0 10px 5px rgba(126, 91, 239, 0)',
          },
        },
        'strong-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: 0.7 },
          '50%': { transform: 'scale(1.03)', opacity: 1 },
        },
        'idle-glimmer': {
          '0%, 100%': { opacity: 0.6 },
          '50%': { opacity: 0.8 },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s infinite',
        'strong-pulse': 'strong-pulse 1.5s ease-in-out infinite',
        'idle-glimmer': 'idle-glimmer 2.5s ease-in-out infinite alternate',
      },
      textShadow: {
        '2xs': '0 0 1px rgba(0, 0, 0, 0.5)',
        xs: '0 1px 2px rgba(0, 0, 0, 0.5)',
        sm: '0 2px 4px rgba(0, 0, 0, 0.5)',
        md: '0 3px 6px rgba(0, 0, 0, 0.5)',
        lg: '0 4px 8px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
};
