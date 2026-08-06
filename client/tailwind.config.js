export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50:'#ECFDF3',100:'#D1FADF',200:'#A6F4C5',300:'#6CE9A6',400:'#32D583',500:'#12B76A',600:'#039855',700:'#027A48',800:'#05603A',900:'#054F31',950:'#032D1D' },
        ink: { 500:'#5A6B62',600:'#33443B',700:'#0F231A',800:'#0A1A13',900:'#06120C',950:'#030907' },
      },
      fontFamily: { sans: ['Inter','system-ui','sans-serif'], display: ['Sora','system-ui','sans-serif'] },
    },
  },
  plugins: [],
}
