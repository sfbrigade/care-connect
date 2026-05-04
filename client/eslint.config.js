import neostandard from 'neostandard';
// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';

export default [
  ...neostandard({
    ignores: [
      '!.storybook',
      'dist/*',
      'dev-dist/*',
    ],
    semi: true
  }),
  ...storybook.configs['flat/recommended'],
];
