import { fn } from 'storybook/test';
import { useDisclosure } from '@mantine/hooks';
import { Button } from '@mantine/core';
import ScanTransferCodeModal from './ScanTransferCodeModal';

export default {
  title: 'Custody/ScanTransferCodeModal',
  component: ScanTransferCodeModal,
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
  },
};

export const Default = {
  render: () => {
    const [opened, { open, close }] = useDisclosure(false);
    return (
      <>
        <Button onClick={open}>Open Scan Transfer Code Modal</Button>
        <ScanTransferCodeModal
          opened={opened}
          onClose={close}
          onSuccess={fn()}
        />
      </>
    );
  },
};

export const Opened = {
  args: {
    opened: true,
    onClose: fn(),
    onSuccess: fn(),
  },
};
