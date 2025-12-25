import HoldSuccess from './HoldSuccess';
import { MemoryRouter } from 'react-router';

export default {
  title: 'LESC/HoldSuccess',
  component: HoldSuccess,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const Default = {
  decorators: [
    (Story) => (
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/success',
            state: {
              holdData: {
                id: '1',
                bedsRequested: 2,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
              },
            },
          },
        ]}
      >
        <Story />
      </MemoryRouter>
    ),
  ],
};
