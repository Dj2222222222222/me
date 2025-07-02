// build-widget.js (in project root)
import { build } from 'esbuild';

build({
  entryPoints: ['public/momentum-widget.js'],
  bundle:       true,
  minify:       true,
  format:       'iife',
  globalName:   'MomentumWidget',
  target:       ['es2017'],
  outfile:      'public/momentum-widget.iife.js',
}).catch(() => process.exit(1));