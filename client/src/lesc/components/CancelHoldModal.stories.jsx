import { fn } from 'storybook/test';
import { useDisclosure } from '@mantine/hooks';
import { Button } from '@mantine/core';
import CancelHoldModal from './CancelHoldModal';

export default {
  title: 'LESC/CancelHoldModal',
  component: CancelHoldModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      inlineStories: false,
      iframeHeight: 600,
    },
  },
  decorators: [
    (Story, context) => {
      const [opened, { open, close }] = useDisclosure(false);
      return (
        <>
          <Button onClick={open}>Open Cancel Hold Modal</Button>
          <Story args={{ ...context.args, opened, onClose: close, onConfirm: fn() }} />
        </>
      );
    },
  ],
  tags: ['autodocs'],
  argTypes: {
    opened: {
      control: 'boolean',
      description: 'Whether the modal is open',
    },
    loading: {
      control: 'boolean',
      description: 'Whether the cancel action is in progress',
    },
  },
};

export const Default = {
  args: {
    deflection: {
      id: '012345',
      subjectId: null,
      subject: null,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 59 * 60 * 1000).toISOString(),
      status: 'ACTIVE',
    }
  },
};

export const WithSubject = {
  args: {
    deflection: {
      ...Default.args.deflection,
      subjectId: 'bfe79463-866a-40b3-8b6a-068e716a02db',
      subject: {
        id: 'bfe79463-866a-40b3-8b6a-068e716a02db',
        firstName: 'John',
        middleInitial: 'D',
        lastName: 'Doe',
        dateOfBirth: '2000-01-01',
        sex: 'MALE',
      },
    }
  },
};
