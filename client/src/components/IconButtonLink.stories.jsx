import IconButtonLink from './IconButtonLink';
import { IconArrowLeft } from '@tabler/icons-react';

export default {
  title: 'Components/IconButtonLink',
  component: IconButtonLink,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const Default = {
  args: {
    icon: IconArrowLeft,
    to: '/',
  },
};

export const Primary = {
  args: {
    variant: 'primary',
    icon: IconArrowLeft,
    to: '/',
  },
};
