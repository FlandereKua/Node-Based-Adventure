import path from 'node:path';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import sucrase from '@rollup/plugin-sucrase';
import copy from 'rollup-plugin-copy';

const appDir = path.resolve('apps/ui-archos');

export default {
  input: path.join(appDir, 'src/main.tsx'),
  output: {
    dir: path.join(appDir, 'dist'),
    format: 'esm',
    sourcemap: true
  },
  plugins: [
    nodeResolve({ browser: true, extensions: ['.js', '.ts', '.tsx'] }),
    commonjs(),
    sucrase({ exclude: ['node_modules/**'], transforms: ['typescript', 'jsx'] }),
    copy({
      targets: [
        { src: path.join(appDir, 'index.html'), dest: path.join(appDir, 'dist') },
        { src: path.join(appDir, 'assets'), dest: path.join(appDir, 'dist') },
        { src: 'assets', dest: path.join(appDir, 'dist') },
        { src: 'data', dest: path.join(appDir, 'dist') }
      ]
    })
  ],
  treeshake: true
};
