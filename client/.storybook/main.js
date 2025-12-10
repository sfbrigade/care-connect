import { dirname } from 'path';
import { mergeConfig } from 'vite';

import { fileURLToPath } from 'url';

/**
* This function is used to resolve the absolute path of a package.
* It is needed in projects that use Yarn PnP or are set up within a monorepo.
*/
function getAbsolutePath (value) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

/** @type { import('@storybook/react-vite').StorybookConfig } */
const config = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../core/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../apps/**/*.stories.@(js|jsx|mjs|ts|tsx)'
  ],
  addons: [
    getAbsolutePath('@chromatic-com/storybook'),
    getAbsolutePath('@storybook/addon-docs'),
    getAbsolutePath('@storybook/addon-onboarding'),
    getAbsolutePath('@storybook/addon-a11y'),
    getAbsolutePath('@storybook/addon-vitest'),
    getAbsolutePath('@vueless/storybook-dark-mode')
  ],
  framework: {
    name: getAbsolutePath('@storybook/react-vite'),
    options: {}
  },
  async viteFinal (config, { configType }) {
    const mergedConfig = mergeConfig(config, {
      esbuild: {
        ...config.esbuild,
        loader: {
          ...config.esbuild?.loader,
          '.js': 'jsx',
          '.mjs': 'jsx'
        }
      }
    });

    // Ensure optimizeDeps also uses jsx loader
    if (!mergedConfig.optimizeDeps) {
      mergedConfig.optimizeDeps = {};
    }
    if (!mergedConfig.optimizeDeps.esbuildOptions) {
      mergedConfig.optimizeDeps.esbuildOptions = {};
    }
    if (!mergedConfig.optimizeDeps.esbuildOptions.loader) {
      mergedConfig.optimizeDeps.esbuildOptions.loader = {};
    }
    mergedConfig.optimizeDeps.esbuildOptions.loader['.js'] = 'jsx';
    mergedConfig.optimizeDeps.esbuildOptions.loader['.mjs'] = 'jsx';

    return mergedConfig;
  }
};
export default config;
