import IconButtonLink from './IconButtonLink';
import { IconArrowLeft } from '@tabler/icons-react';
import { BrowserRouter } from 'react-router';

export default {
  title: 'Components/IconButtonLink',
  component: IconButtonLink,
  decorators: [
    (Story) => (
      <BrowserRouter>
        <Story />
      </BrowserRouter>
    ),
  ],
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
