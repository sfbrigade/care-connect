import { build, context } from 'esbuild';

const watch = process.argv.includes('--watch');

const options = {
  entryPoints: [
    'lib/forms/jsx/*.jsx',
    'lib/forms/pdf/*.jsx',
  ],
  outdir: 'lib/forms/dist',
  entryNames: '[name]',
  format: 'esm',
  jsx: 'automatic',
  packages: 'external',
  loader: { '.css': 'text' },
  bundle: true,
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('Watching for form changes...');
} else {
  await build(options);
}
