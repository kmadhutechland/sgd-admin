export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // the website's palette, so the panel reads as the same product
        brand: { 50:'#ECFDF3',100:'#D1FADF',200:'#A6F4C5',300:'#6CE9A6',400:'#32D583',500:'#12B76A',600:'#039855',700:'#027A48',800:'#05603A',900:'#054F31',950:'#032D1D' },
        // the lime accent — used sparingly, for the one thing that is "live"
        volt: { 300:'#D6FF4B',400:'#C9F73C',500:'#BFF700',600:'#A3D600' },
        ink: { 400:'#889990',500:'#5A6B62',600:'#33443B',700:'#0F231A',800:'#0A1A13',900:'#06120C',950:'#030907' },
      },
      fontFamily: { sans: ['Inter','system-ui','sans-serif'], display: ['Sora','system-ui','sans-serif'] },
      /*
       * Tailwind's default ring is blue-500, which is nowhere in this palette.
       * A `ring-*` class that fails to generate — an opacity step off the
       * default scale, say — silently falls back to it, and a stray blue ring
       * on a green panel is easy to miss in review. Defaulting to brand means
       * that mistake is invisible rather than wrong.
       */
      ringColor: { DEFAULT: '#12B76A' },
      boxShadow: {
        // a green-tinted lift rather than a grey one, so cards sit on the
        // warm background instead of looking cut out of it
        card: '0 1px 2px rgba(6,18,12,.04), 0 8px 24px -12px rgba(6,18,12,.12)',
        lift: '0 2px 4px rgba(6,18,12,.05), 0 16px 32px -16px rgba(6,18,12,.20)',
        glow: '0 6px 20px -6px rgba(18,183,106,.45)',
      },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
      },
      animation: { 'fade-up': 'fade-up .35s cubic-bezier(.22,1,.36,1) both' },
    },
  },
  plugins: [],
}
