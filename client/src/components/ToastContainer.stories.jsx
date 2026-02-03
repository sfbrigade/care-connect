import { Button, Group, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import ToastContainer from './ToastContainer';
import { ToastContext, ToastProvider, useToast } from './ToastContext';

export default {
  title: 'Components/ToastContainer',
  component: ToastContainer,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <>
        <style>
          {`
            @keyframes slideDown {
              from {
                transform: translateY(-12px);
                opacity: 0;
              }
              to {
                transform: translateY(0);
                opacity: 1;
              }
            }
          `}
        </style>
        <Story />
      </>
    ),
  ],
  argTypes: {
    toasts: {
      control: 'object',
      description: 'Toasts provided via ToastContext for this story',
    },
  },
};

export const Static = {
  args: {
    toasts: [
      { id: '1', message: 'Saved successfully', variant: 'success' },
      { id: '2', message: 'Failed to save. Try again.', variant: 'error' },
      { id: '3', message: 'Heads up: hold expires soon', variant: 'warning' },
      { id: '4', message: 'New beds available', variant: 'info' },
      { id: '5', message: 'Subject received', messageSecondary: 'Transfer code confirmed.', variant: 'success' },
    ],
  },
  render: (args) => {
    const [toasts, setToasts] = useState(args.toasts);
    
    const removeToast = (id) => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
      <ToastContext.Provider
        value={{
          toasts,
          showToast: () => null,
          removeToast,
        }}
      >
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 24 }}>
          <Stack gap='xs' style={{ maxWidth: 560 }}>
            <Text fw={600}>Static toast examples</Text>
            <Text c='dimmed'>
              Toasts are fixed to the top center of the viewport on mobile and to the right on desktop. Edit styles in
              `ToastContainer.jsx` / `Notification.jsx` and see changes here.
            </Text>
          </Stack>
          <ToastContainer />
        </div>
      </ToastContext.Provider>
    );
  },
};

function InteractiveHarness () {
  const { showToast, removeToast, toasts } = useToast();

  const clearAll = () => {
    // Copy to avoid mutation issues while removing
    [...toasts].forEach((t) => removeToast(t.id));
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 24 }}>
      <Stack gap='md' style={{ maxWidth: 760 }}>
        <Text fw={600}>Interactive toasts</Text>
        <Text c='dimmed'>
          Use the buttons to spawn and clear toasts.
          <br />
          Some are “sticky” (duration 0) so you can iterate on styling without them disappearing.
        </Text>
        <Group>
          <Button onClick={() => showToast('Saved successfully', 'success', 0)}>
            Sticky success
          </Button>
          <Button onClick={() => showToast('Failed to save. Try again.', 'error', 0)}>
            Sticky error
          </Button>
          <Button onClick={() => showToast('Heads up: hold expires soon', 'warning', 0)}>
            Sticky warning
          </Button>
          <Button onClick={() => showToast('New beds available', 'info', 0)}>
            Sticky info
          </Button>
          <Button onClick={() => showToast('Subject received', 'success', 0, 'Transfer code confirmed.')}>
            With secondary message
          </Button>
          <Button variant='light' onClick={() => showToast('Auto-dismiss in 2s', 'success', 2000)}>
            Auto-dismiss
          </Button>
          <Button variant='default' onClick={clearAll} disabled={toasts.length === 0}>
            Clear all
          </Button>
        </Group>
      </Stack>
      <ToastContainer />
    </div>
  );
}

export const Interactive = {
  render: () => (
    <ToastProvider>
      <InteractiveHarness />
    </ToastProvider>
  ),
};

