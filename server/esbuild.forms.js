import { build, context } from 'esbuild';

const watch = process.argv.includes('--watch');

const options = {
  entryPoints: [
    'lib/forms/647f/Form647f.jsx',
    'lib/forms/cert/NarcoticsNotice.jsx',
    'lib/forms/shared/FormContainer.jsx',
    'lib/forms/shared/formComponents.jsx',
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
