import { useEffect, useState } from 'react';
import { ActionIcon, Box, Button, Group, Loader, Modal, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

import QRScanner from '@/components/QRScanner';

function ScanCodeModal ({ opened, onClose, onScan, prompt, manualEntryTitle, loadingText, _debugScanPhase }) {
  const [isLoading, setIsLoading] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [code, setCode] = useState('');

  useEffect(() => {
    if (!opened) return;
    setIsLoading(false);
    setManualEntry(false);
    setCode('');
  }, [opened]);

  async function handleScan (text) {
    await onScan(text);
  }

  async function handleManualScan (text) {
    setIsLoading(true);
    try {
      await onScan(text);
      handleClose();
    } catch {
      setIsLoading(false);
    }
  }

  function handleManualSubmit (e) {
    e.preventDefault();
    handleManualScan(code);
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
          <Text c='dimmed'>{loadingText || 'Processing...'}</Text>
        </Stack>
      )}

      {!isLoading && manualEntry && (
        <Stack p='lg' gap='lg' h='100dvh' maw={500} mx='auto' w='100%'>
          <Group justify='space-between' align='center'>
            <Title order={3}>{manualEntryTitle || 'Enter Code'}</Title>
            <ActionIcon variant='subtle' color='gray' size='lg' onClick={handleClose}>
              <IconX size={24} />
            </ActionIcon>
          </Group>

          <form onSubmit={handleManualSubmit}>
            <Stack gap='md'>
              <TextInput
                label='Code'
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
            prompt={prompt}
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

export default ScanCodeModal;
