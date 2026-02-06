import { useState } from 'react';
import { ActionIcon, Alert, Button, Group, Loader, Modal, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconAlertCircle, IconX } from '@tabler/icons-react';

import Api from '@/Api';
import QRScanner from '@/components/QRScanner';

function ScanTransferCodeModal ({ opened, onClose, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [code, setCode] = useState('');

  function parseDeflectionId (text) {
    const urlMatch = text.match(/\/transfer\/(\d+)/);
    if (urlMatch) return parseInt(urlMatch[1], 10);
    const numMatch = text.trim().match(/^\d+$/);
    if (numMatch) return parseInt(numMatch[0], 10);
    return null;
  }

  async function handleTransfer (text) {
    const deflectionId = parseDeflectionId(text);
    if (!deflectionId) {
      setError('Invalid code. Please enter a transfer code number or URL.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await Api.deflections.transfer(deflectionId);
      onSuccess?.();
      handleClose();
    } catch (err) {
      setError(err._form || 'Failed to transfer subject into custody. Please try again.');
      setIsLoading(false);
    }
  }

  function handleManualSubmit (e) {
    e.preventDefault();
    handleTransfer(code);
  }

  function handleClose () {
    setError(null);
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
      <Stack p='lg' gap='lg' h='100dvh'>
        <Group justify='space-between' align='center'>
          <Title order={3}>{manualEntry ? 'Enter Transfer Code' : 'Scan Transfer Code'}</Title>
          <ActionIcon variant='subtle' color='gray' size='lg' onClick={handleClose}>
            <IconX size={24} />
          </ActionIcon>
        </Group>

        {isLoading && (
          <Stack align='center' justify='center' flex={1}>
            <Loader size='lg' />
            <Text c='dimmed'>Transferring subject into custody...</Text>
          </Stack>
        )}

        {!isLoading && manualEntry && (
          <>
            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color='red' onClose={() => setError(null)} withCloseButton>
                {error}
              </Alert>
            )}

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

            <Button variant='outline' fullWidth size='lg' onClick={() => { setManualEntry(false); setError(null); }}>
              Scan QR code instead
            </Button>
          </>
        )}

        {!isLoading && !manualEntry && (
          <>
            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color='red' onClose={() => setError(null)} withCloseButton>
                {error}
              </Alert>
            )}

            <QRScanner
              onScanSuccess={(text) => handleTransfer(text)}
              autoStart
            />

            <Button variant='outline' fullWidth size='lg' onClick={() => { setManualEntry(true); setError(null); }}>
              Enter code manually
            </Button>
          </>
        )}
      </Stack>
    </Modal>
  );
}

export default ScanTransferCodeModal;
