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

const baseDeflection = {
  id: '012345',
  subjectId: null,
  subject: null,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 59 * 60 * 1000).toISOString(),
  status: 'ACTIVE',
};

const baseDeflectionWithSubject = {
  ...baseDeflection,
  id: '012346',
  subjectId: 'bfe79463-866a-40b3-8b6a-068e716a02db',
  subject: {
    id: 'bfe79463-866a-40b3-8b6a-068e716a02db',
    firstName: 'John',
    middleInitial: 'D',
    lastName: 'Doe',
    dateOfBirth: '2000-01-01',
    sex: 'MALE',
  },
};

export const Default = {
  args: {
    deflections: [baseDeflection],
  },
};

export const WithSubject = {
  args: {
    deflections: [baseDeflectionWithSubject],
  },
};

export const MultipleMixed = {
  args: {
    deflections: [baseDeflectionWithSubject, baseDeflection],
  },
};

export const MultipleNoSubjects = {
  args: {
    deflections: [baseDeflection, { ...baseDeflection, id: '012347' }],
  },
};

export const Loading = {
  args: {
    deflections: [baseDeflection],
    loading: true,
  },
};

export const LoadingWithSubject = {
  args: {
    deflections: [baseDeflectionWithSubject],
    loading: true,
  },
};
