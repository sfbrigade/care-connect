// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import neostandard from 'neostandard';

export default neostandard({
  ignores: [
    'dist/*',
  ],
  semi: true
});
