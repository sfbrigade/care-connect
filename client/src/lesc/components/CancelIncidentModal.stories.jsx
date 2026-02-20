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
};

export const Default = {
  args: {

  },
};

export const WithReason = {
  args: {
    requiresReason: true,
  },
};

export const LastHold = {
  args: {
    isLastHoldDetailedCancellation: true,
  }
};

export const LastHoldWithReason = {
  args: {
    isLastHoldDetailedCancellation: true,
    requiresReason: true,
  }
};
