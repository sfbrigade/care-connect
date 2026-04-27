import neostandard from 'neostandard';

export default [
  ...neostandard({ semi: true }),
  {
    languageOptions: {
      ecmaVersion: 'latest',
    }
  },
  { ignores: ['lib/forms/dist/'] },
];
