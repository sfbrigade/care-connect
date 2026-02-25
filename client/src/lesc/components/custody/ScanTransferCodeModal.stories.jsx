import { fn } from 'storybook/test';
import { useDisclosure } from '@mantine/hooks';
import { Button } from '@mantine/core';
import { facilityContext } from '@/FacilityContext';
import { ToastProvider } from '@/components/ToastContext';
import ScanTransferCodeModal from './ScanTransferCodeModal';

const mockFacility = { id: 1, name: 'RESET' };

export default {
  title: 'LESC/Custody/ScanTransferCodeModal',
  component: ScanTransferCodeModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      inlineStories: false,
      iframeHeight: 600,
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <facilityContext.Provider value={{ facility: mockFacility, setFacility: fn() }}>
        <ToastProvider>
          <Story />
        </ToastProvider>
      </facilityContext.Provider>
    ),
  ],
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

export const ScanLoading = {
  args: {
    opened: true,
    onClose: fn(),
    onSuccess: fn(),
    _debugScanPhase: 'pending',
  },
};

export const ScanSuccess = {
  args: {
    opened: true,
    onClose: fn(),
    onSuccess: fn(),
    _debugScanPhase: 'success',
  },
};

export const ScanError = {
  args: {
    opened: true,
    onClose: fn(),
    onSuccess: fn(),
    _debugScanPhase: 'error',
  },
};
