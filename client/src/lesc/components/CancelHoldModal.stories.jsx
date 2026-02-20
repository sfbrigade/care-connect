import { fn } from 'storybook/test';
import { useDisclosure } from '@mantine/hooks';
import { Button } from '@mantine/core';
import CancelHoldModal from './CancelHoldModal';

const deflectionWithSubject = {
  id: 123,
  subjectId: 'bfe79463-866a-40b3-8b6a-068e716a02db',
  subject: {
    firstName: 'John',
    middleInitial: 'D',
    lastName: 'Doe',
  },
};

const deflectionWithoutSubject = {
  id: 456,
  subjectId: null,
  subject: null,
};

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
  tags: ['autodocs'],
};

export const WithSubject = {
  render: () => {
    const [opened, { open, close }] = useDisclosure(false);
    return (
      <>
        <Button onClick={open}>Open Cancel Hold Modal</Button>
        <CancelHoldModal
          opened={opened}
          onClose={close}
          onConfirm={fn(() => close())}
          deflection={deflectionWithSubject}
        />
      </>
    );
  },
};

export const WithoutSubject = {
  render: () => {
    const [opened, { open, close }] = useDisclosure(false);
    return (
      <>
        <Button onClick={open}>Open Cancel Hold Modal</Button>
        <CancelHoldModal
          opened={opened}
          onClose={close}
          onConfirm={fn(() => close())}
          deflection={deflectionWithoutSubject}
        />
      </>
    );
  },
};

export const Loading = {
  render: () => {
    const [opened, { open, close }] = useDisclosure(false);
    return (
      <>
        <Button onClick={open}>Open Cancel Hold Modal</Button>
        <CancelHoldModal
          opened={opened}
          onClose={close}
          onConfirm={fn()}
          deflection={deflectionWithSubject}
          loading
        />
      </>
    );
  },
};

export const OpenedWithSubject = {
  args: {
    opened: true,
    onClose: fn(),
    onConfirm: fn(),
    deflection: deflectionWithSubject,
  },
};

export const OpenedWithoutSubject = {
  args: {
    opened: true,
    onClose: fn(),
    onConfirm: fn(),
    deflection: deflectionWithoutSubject,
  },
};
