export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        crema: {
          50: '#FBF7F2',
          100: '#F4EDE4',
          200: '#EADFD1',
        },
        cafe: {
          50: '#F7F3EF',
          100: '#EBE2D9',
          200: '#DCCEC1',
          300: '#C4AE9B',
          400: '#A98D74',
          500: '#8D6E53',
          600: '#73573F',
          700: '#5C4533',
          800: '#45342A',
          900: '#2B1D16',
        },
        ambar: {
          50: '#FDF6E7',
          100: '#FAE9C4',
          200: '#F3D79A',
          800: '#8A5B10',
          900: '#6B4509',
        },
        verde: {
          50: '#EFF6EE',
          100: '#DCEBDA',
          200: '#BBD8B7',
          800: '#2F6B2A',
          900: '#24521F',
        },
        rojo: {
          50: '#FCF0EE',
          100: '#F8DDD9',
          200: '#EFBDB5',
          300: '#E09E93',
          400: '#CF7667',
          700: '#A33D2B',
          800: '#8A3122',
          900: '#6B251A',
        },
        azul: {
          50: '#EEF3F7',
          100: '#DAE5EE',
          200: '#B6CCDD',
          800: '#2B5673',
          900: '#204158',
        },
      },
      fontFamily: {

        sans: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
};
