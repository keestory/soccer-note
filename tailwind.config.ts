import type { Config } from 'tailwindcss'
import colors from 'tailwindcss/colors'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: colors.emerald,
        field: '#2D5A27',
        position: {
          gk: colors.amber[500],
          df: colors.blue[500],
          mf: colors.emerald[500],
          fw: colors.red[500],
        }
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      aspectRatio: {
        'field': '3 / 2',
      },
    },
  },
  plugins: [],
}
export default config
