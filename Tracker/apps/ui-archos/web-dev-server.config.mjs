import path from 'node:path';
import { sucraseMiddleware } from './wds-sucrase.mjs';

const rootDir = path.resolve('apps/ui-archos');

export default {
  rootDir,
  appIndex: 'index.html',
  nodeResolve: true,
  open: false,
  watch: true,
  middleware: [sucraseMiddleware()]
};
