import { fn } from 'storybook/test';
import { useDisclosure } from '@mantine/hooks';
import { Button } from '@mantine/core';

import CancelIncidentModal from './CancelIncidentModal';

export default {
  title: 'LESC/CancelIncidentModal',
  component: CancelIncidentModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      inlineStories: false,
      iframeHeight: 500,
    },
  },
  tags: ['autodocs'],
};

export const Default = {
  args: {
    opened: true,
    onClose: fn(),
    onConfirm: fn(),
    loading: false,
  },
};

export const Interactive = {
  render: () => {
    const [opened, { open, close }] = useDisclosure(false);

    return (
      <div style={{ padding: '20px' }}>
        <Button onClick={open}>Open Cancel Incident Modal</Button>
        <CancelIncidentModal
          opened={opened}
          onClose={close}
          onConfirm={fn(() => {
            close();
          })}
        />
      </div>
    );
  },
};
