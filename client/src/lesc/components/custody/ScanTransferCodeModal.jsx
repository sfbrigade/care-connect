import { useState } from 'react';
import { ActionIcon, Box, Button, Group, Loader, Modal, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

import Api from '@/Api';
import { useFacilityContext } from '@/FacilityContext';
import { useToast } from '@/components/ToastContext';
import QRScanner from '@/components/QRScanner';

function ScanTransferCodeModal ({ opened, onClose, onSuccess, _debugScanPhase }) {
  const [isLoading, setIsLoading] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [code, setCode] = useState('');
  const { facility } = useFacilityContext();
  const { showToast } = useToast();

  // TODO: this should probably check that the domain (from the other device's QR code url) is the same as this device's current domain
  function parseDeflectionId (text) {
    const urlMatch = text.match(/\/transfer\/(\d+)/);
    if (urlMatch) return parseInt(urlMatch[1], 10);
    const numMatch = text.trim().match(/^\d+$/);
    if (numMatch) return parseInt(numMatch[0], 10);
    return null;
  }

  async function handleScan (text) {
    const deflectionId = parseDeflectionId(text);
    if (!deflectionId) {
      showToast('Invalid QR code format.', 'error');
      throw new Error('Invalid code');
    }

    try {
      await Api.deflections.transfer(deflectionId);
      window.sessionStorage.setItem('custodyHighlightTarget', String(deflectionId));
      onSuccess?.();
      showToast('Subject received', 'success', 3000, 'Transfer code confirmed.');
    } catch (err) {
      showToast(err._form || 'Failed to transfer subject into custody. Please try again.', 'error');
      throw err;
    }
  }

  async function handleTransfer (text) {
    const deflectionId = parseDeflectionId(text);
    if (!deflectionId) {
      showToast('Invalid code. Please enter a transfer code number or URL.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await Api.deflections.transfer(deflectionId);
      window.sessionStorage.setItem('custodyHighlightTarget', String(deflectionId));
      onSuccess?.();
      handleClose();
    } catch (err) {
      showToast(err._form || 'Failed to transfer subject into custody. Please try again.', 'error');
      setIsLoading(false);
    }
  }

  function handleManualSubmit (e) {
    e.preventDefault();
    handleTransfer(code);
  }

  function handleClose () {
    setIsLoading(false);
    setManualEntry(false);
    setCode('');
    onClose();
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      fullScreen
      withCloseButton={false}
      padding={0}
    >
      {isLoading && (
        <Stack align='center' justify='center' h='100dvh'>
          <Loader size='lg' />
          <Text c='dimmed'>Transferring subject into custody...</Text>
        </Stack>
      )}

      {!isLoading && manualEntry && (
        <Stack p='lg' gap='lg' h='100dvh' maw={500} mx='auto' w='100%'>
          <Group justify='space-between' align='center'>
            <Title order={3}>Enter Transfer Code</Title>
            <ActionIcon variant='subtle' color='gray' size='lg' onClick={handleClose}>
              <IconX size={24} />
            </ActionIcon>
          </Group>

          <form onSubmit={handleManualSubmit}>
            <Stack gap='md'>
              <TextInput
                label='Transfer code'
                placeholder='e.g. 123456'
                value={code}
                onChange={(e) => setCode(e.currentTarget.value)}
                size='lg'
                autoFocus
              />
              <Button type='submit' fullWidth size='lg' disabled={!code.trim()}>
                Submit
              </Button>
            </Stack>
          </form>

          <Button variant='outline' fullWidth size='lg' onClick={() => setManualEntry(false)}>
            Scan QR code instead
          </Button>
        </Stack>
      )}

      {!isLoading && !manualEntry && (
        <Box pos='relative' h='100dvh' w='100%' bg='black'>
          <QRScanner
            onScanSuccess={(text) => handleScan(text)}
            autoStart
            fullScreen
            prompt={`Scan the subject's QR code to transfer custody to ${facility?.name || 'this facility'}.`}
            _debugScanPhase={_debugScanPhase}
          />

          <Stack
            pos='absolute'
            top={0}
            left={0}
            right={0}
            bottom={0}
            justify='space-between'
            align='center'
            p='xl'
            style={{ zIndex: 10, pointerEvents: 'none' }}
          >
            <Group justify='flex-end' w='100%' style={{ pointerEvents: 'auto' }}>
              <ActionIcon
                variant='white'
                color='dark'
                size='xl'
                radius='xl'
                onClick={handleClose}
              >
                <IconX size={24} />
              </ActionIcon>
            </Group>

            <div />

            <Stack align='center' gap='lg' w='100%' maw={400} style={{ pointerEvents: 'auto' }}>
              <Button
                variant='outline'
                color='white'
                size='lg'
                radius='xl'
                onClick={() => setManualEntry(true)}
              >
                Enter code manually
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}
    </Modal>
  );
}

export default ScanTransferCodeModal;
