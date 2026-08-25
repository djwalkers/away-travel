import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        salop: {
          blue: '#0057B8',
          'blue-hover': '#004694',
          'blue-light': '#1E6FE0',
          amber: '#FFC72C',
          'amber-hover': '#E6B022',
          'amber-dark': '#D99E0B',
          night: '#070B14',
          surface: '#0E1726',
          card: '#0A1220',
          border: '#1A2742',
        },
      },
    },
  },
  plugins: [],
}
export default config
