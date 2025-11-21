import IntakeForm from './IntakeForm';
import { MemoryRouter } from 'react-router';

export default {
  title: 'LESC/IntakeForm',
  component: IntakeForm,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export const Default = {};

