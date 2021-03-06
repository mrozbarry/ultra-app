import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import pkg from './package.json';

export default {
  input: './src/index.js',
  output: {
    name: 'ultraApp',
    file: pkg.browser,
    format: 'iife',
  },
  plugins: [
    resolve(),
    commonjs({
      include: 'node_modules/**'
    }),
  ],
};
