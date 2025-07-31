const { build } = require('esbuild');
const path = require('path');

// Build configuration for Socket Mode
build({
  entryPoints: ['socket-mode.js'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist/socket-mode.js',
  external: ['@slack/bolt', '@slack/socket-mode', '@slack/web-api', 'openai', 'axios', 'dotenv'],
  format: 'cjs',
  sourcemap: true,
  tsconfig: './tsconfig.json',
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}).catch(() => process.exit(1));
