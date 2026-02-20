import { fn } from 'storybook/test';
import { useDisclosure } from '@mantine/hooks';
import { Button } from '@mantine/core';
import { facilityContext } from '@/FacilityContext';
import { ToastProvider } from '@/components/ToastContext';
import ScanAdmitCodeModal from './ScanAdmitCodeModal';

const mockFacility = { id: 1, name: 'RESET' };

export default {
  title: 'LESC/Care/ScanAdmitCodeModal',
  component: ScanAdmitCodeModal,
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
        <Button onClick={open}>Open Scan Admit Code Modal</Button>
        <ScanAdmitCodeModal
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
