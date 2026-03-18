import { fn } from 'storybook/test';

import BooleanInput from './BooleanInput';

export default {
  title: 'Components/BooleanInput',
  component: BooleanInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const Uncontrolled = {
  args: {
    label: 'Uncontrolled',
    defaultValue: null,
    onChange: fn(),
  },
};

export const UncontrolledDefaultTrue = {
  args: {
    label: 'Uncontrolled with default value true',
    defaultValue: true,
    onChange: fn(),
  },
};

export const UncontrolledDefaultFalse = {
  args: {
    label: 'Uncontrolled with default value false',
    defaultValue: false,
    onChange: fn(),
  },
};
