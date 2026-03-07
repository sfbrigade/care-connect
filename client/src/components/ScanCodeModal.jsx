import { useState } from 'react';
import { ActionIcon, Box, Button, Container, Group, Loader, Modal, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconArrowLeft, IconX } from '@tabler/icons-react';

import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import QRScanner from '@/components/QRScanner';
import { sanitizeManualCodeInput } from './scanCodeModalUtils';

function ScanCodeModal ({
  opened,
  onClose,
  onScan,
  onManualSubmitCodes,
  prompt,
  manualEntryTitle,
  manualEntryLabel,
  manualEntryDescription,
  manualEntryInputPlaceholder,
  manualEntryAddButtonLabel,
  manualEntryAllowMultiple = false,
  loadingText,
  _debugScanPhase
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [codes, setCodes] = useState(['']);

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

  async function handleManualSubmit (e) {
    e.preventDefault();
    const trimmedCodes = codes.map((code) => code.trim()).filter(Boolean);
    if (trimmedCodes.length === 0) return;

    if (manualEntryAllowMultiple && onManualSubmitCodes) {
      setIsLoading(true);
      try {
        await onManualSubmitCodes(trimmedCodes);
        handleClose();
      } catch {
        setIsLoading(false);
      }
      return;
    }

    await handleManualScan(trimmedCodes[0]);
  }

  function handleClose () {
    setIsLoading(false);
    setManualEntry(false);
    setCodes(['']);
    onClose();
  }

  function handleCodeChange (index, value) {
    const sanitizedValue = sanitizeManualCodeInput(value);
    setCodes((prev) => prev.map((code, codeIndex) => (codeIndex === index ? sanitizedValue : code)));
  }

  function handleAddCodeField () {
    setCodes((prev) => [...prev, '']);
  }

  const trimmedCodes = codes.map((code) => code.trim());
  const hasAtLeastOneCode = trimmedCodes.some(Boolean);
  const hasAnyEmptyCodeField = trimmedCodes.some((code) => !code);
  const canSubmit = hasAtLeastOneCode && !hasAnyEmptyCodeField;
  const canAddAnotherCode = manualEntryAllowMultiple && canSubmit;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      fullScreen
      withCloseButton={false}
      padding={0}
      styles={{
        content: {
          background: 'var(--mantine-color-gray-0)',
        }
      }}
    >
      {isLoading && (
        <Stack align='center' justify='center' h='100dvh'>
          <Loader size='lg' />
          <Text c='dimmed'>{loadingText || 'Processing...'}</Text>
        </Stack>
      )}

      {!isLoading && manualEntry && (
        <>
          <Header>
            <Group w='100%' justify='space-between'>
              <IconButtonLink icon={IconArrowLeft} onClick={() => setManualEntry(false)} />
              <IconButtonLink icon={IconX} onClick={handleClose} />
            </Group>
          </Header>
          <Container pt='80px'>
            <form onSubmit={handleManualSubmit}>
              <Stack gap='xl'>
                {manualEntryAllowMultiple
                  ? (
                    <Box>
                      <Text size='xl' c='dimmed'>
                        {manualEntryLabel || 'Enter transfer code'}
                      </Text>
                      <Title order={3}>
                        {manualEntryDescription || 'If the QR code does not work, ask the officer for the 6-digit transfer code.'}
                      </Title>
                    </Box>
                    )
                  : <Title order={3}>{manualEntryTitle || 'Enter Code'}</Title>}

                <Stack gap='sm'>
                  {codes.map((code, index) => (
                    <TextInput
                      key={index}
                      placeholder={manualEntryInputPlaceholder || 'Enter a 6-digit code'}
                      value={code}
                      onChange={(e) => handleCodeChange(index, e.currentTarget.value)}
                      inputMode='numeric'
                      pattern='[0-9]*'
                      maxLength={6}
                      autoFocus={index === 0}
                    />
                  ))}
                </Stack>

                <Group gap='sm'>
                  {manualEntryAllowMultiple && (
                    <Button
                      variant='secondary'
                      onClick={handleAddCodeField}
                      disabled={!canAddAnotherCode}
                    >
                      {manualEntryAddButtonLabel || '+ Transfer code'}
                    </Button>
                  )}
                  <Button
                    type='submit'
                    variant='primary'
                    disabled={!canSubmit}
                  >
                    Submit
                  </Button>
                </Group>
              </Stack>
            </form>
          </Container>
        </>
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
