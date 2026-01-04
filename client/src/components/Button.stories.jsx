import { Button } from '@mantine/core';

export default {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      type: 'text'
    },
    variant: {
      type: 'text'
    },
  },
};

export const Secondary = {
  args: {
    children: 'Button Label',
    variant: 'secondary',
  },
};
