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
  tags: ['autodocs'],
  argTypes: {
    opened: {
      control: 'boolean',
      description: 'Whether the modal is open',
    },
    holdIdentifier: {
      control: 'text',
      description: 'Hold identifier (e.g., "001")',
    },
    holdName: {
      control: 'text',
      description: 'Name of the person associated with the hold',
    },
    loading: {
      control: 'boolean',
      description: 'Whether the cancel action is in progress',
    },
  },
};

export const Default = {
  args: {
    opened: true
  },
  render: () => {
    const [opened, { open, close }] = useDisclosure(false);
    return (
      <>
        <Button onClick={open}>Open Cancel Hold Modal</Button>
        <CancelHoldModal
          opened={opened}
          onClose={close}
          onConfirm={fn(() => {
            console.log('Cancel hold confirmed');
            close();
          })}
          holdIdentifier='001'
          holdName='John Doe'
        />
      </>
    );
  }
};

export const WithDifferentName = {
  render: () => {
    const [opened, { open, close }] = useDisclosure(false);
    return (
      <>
        <Button onClick={open}>Open Cancel Hold Modal</Button>
        <CancelHoldModal
          opened={opened}
          onClose={close}
          onConfirm={fn(() => {
            console.log('Cancel hold confirmed');
            close();
          })}
          holdIdentifier='002'
          holdName='Jane Smith'
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
          onConfirm={fn(() => {
            console.log('Cancel hold confirmed');
            // Simulate async operation
            setTimeout(() => {
              close();
            }, 2000);
          })}
          holdIdentifier='001'
          holdName='John Doe'
          loading
        />
      </>
    );
  },
};

export const Opened = {
  args: {
    opened: true,
    onClose: fn(),
    onConfirm: fn(),
    holdIdentifier: '001',
    holdName: 'John Doe',
    loading: false,
  },
};

export const Interactive = {
  render: () => {
    const [opened, { open, close }] = useDisclosure(false);
    return (
      <div style={{ padding: '20px' }}>
        <Button onClick={open}>Open Cancel Hold Modal</Button>
        <CancelHoldModal
          opened={opened}
          onClose={close}
          onConfirm={fn(() => {
            console.log('Cancel hold confirmed');
            close();
          })}
          holdIdentifier='001'
          holdName='John Doe'
        />
      </div>
    );
  },
};
