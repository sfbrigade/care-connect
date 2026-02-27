import { useState } from 'react';
import { ActionIcon, Box, Button, Group, Loader, Modal, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconArrowLeft, IconX } from '@tabler/icons-react';

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
  const isTransferManualView = manualEntryAllowMultiple;

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
        <Stack
          p={isTransferManualView ? '40px 20px' : 'lg'}
          gap={isTransferManualView ? 24 : 'lg'}
          h='100dvh'
          miw={0}
          w='100%'
          maw={isTransferManualView ? '100%' : 500}
          mx='auto'
          bg={isTransferManualView ? '#F8F9FA' : undefined}
        >
          <Group
            justify='space-between'
            align='center'
            gap={isTransferManualView ? 138 : undefined}
            w='100%'
            h={44}
            style={isTransferManualView ? { alignSelf: 'stretch' } : undefined}
          >
            <ActionIcon
              variant='filled'
              size={44}
              radius={32}
              style={{
                background: 'rgba(134, 142, 150, 0.1)',
                color: '#000000'
              }}
              onClick={() => setManualEntry(false)}
            >
              <IconArrowLeft size={20} />
            </ActionIcon>
            <ActionIcon
              variant='filled'
              size={44}
              radius={32}
              style={{
                background: 'rgba(134, 142, 150, 0.1)',
                color: '#000000'
              }}
              onClick={handleClose}
            >
              <IconX size={20} />
            </ActionIcon>
          </Group>

          {manualEntryAllowMultiple
            ? (
              <Stack
                gap={0}
                align='flex-start'
                p={0}
                w='100%'
                style={{ alignSelf: 'stretch' }}
              >
                <Text
                  c='#868E96'
                  ff='Roboto, sans-serif'
                  fw={400}
                  fz={20}
                  lh='32px'
                >
                  {manualEntryLabel || 'Enter transfer code'}
                </Text>
                <Text
                  c='#000000'
                  ff='Roboto, sans-serif'
                  fw={400}
                  fz={24}
                  lh='32px'
                >
                  {manualEntryDescription || 'If the QR code does not work, ask the officer for the 6-digit transfer code.'}
                </Text>
              </Stack>
              )
            : <Title order={3}>{manualEntryTitle || 'Enter Code'}</Title>}

          <form onSubmit={handleManualSubmit}>
            <Stack gap={8} w='100%'>
              {codes.map((code, index) => (
                <TextInput
                  key={index}
                  placeholder={manualEntryInputPlaceholder || 'Enter a 6-digit code'}
                  value={code}
                  onChange={(e) => handleCodeChange(index, e.currentTarget.value)}
                  inputMode='numeric'
                  pattern='[0-9]*'
                  maxLength={6}
                  size={isTransferManualView ? 'md' : 'lg'}
                  autoFocus={index === 0}
                  w='100%'
                  h={48}
                  styles={{
                    input: {
                      height: 48,
                      minHeight: 48,
                      borderRadius: 8,
                      border: '1px solid #DEE2E6',
                      background: '#FFFFFF',
                      padding: '0 16px',
                      fontFamily: 'Roboto, sans-serif',
                      fontWeight: 400,
                      fontSize: 18,
                      lineHeight: '28px',
                      color: '#000000'
                    },
                    placeholder: {
                      color: '#ADB5BD',
                      fontFamily: 'Roboto, sans-serif',
                      fontWeight: 400,
                      fontSize: 18,
                      lineHeight: '28px'
                    }
                  }}
                />
              ))}

              <Group gap={8} wrap='nowrap' w='100%' h={48}>
                {manualEntryAllowMultiple && (
                  <Button
                    variant='filled'
                    size='md'
                    radius={32}
                    style={{
                      minWidth: 173,
                      height: 48,
                      padding: '10px 24px',
                      background: canAddAnotherCode ? '#E0E7FF' : '#E9ECEF',
                      color: canAddAnotherCode ? '#4263EB' : '#ADB5BD',
                      fontFamily: 'Roboto, sans-serif',
                      fontWeight: 400,
                      fontSize: 18,
                      lineHeight: '28px',
                      whiteSpace: 'nowrap',
                      flex: '1 1 173px'
                    }}
                    onClick={handleAddCodeField}
                    disabled={!canAddAnotherCode}
                  >
                    {manualEntryAddButtonLabel || '+ Transfer code'}
                  </Button>
                )}
                <Button
                  type='submit'
                  size={isTransferManualView ? 'md' : 'lg'}
                  radius={32}
                  style={manualEntryAllowMultiple
                    ? {
                        minWidth: 96,
                        height: 48,
                        padding: '10px 16px',
                        background: canSubmit ? '#4C6EF5' : '#E9ECEF',
                        color: canSubmit ? '#FFFFFF' : '#ADB5BD',
                        fontFamily: 'Roboto, sans-serif',
                        fontWeight: 400,
                        fontSize: 18,
                        lineHeight: '28px',
                        whiteSpace: 'nowrap',
                        flex: '1 1 96px'
                      }
                    : { width: '100%' }}
                  disabled={!canSubmit}
                >
                  Submit
                </Button>
              </Group>
            </Stack>
          </form>

          {!manualEntryAllowMultiple && (
            <Button variant='outline' fullWidth size='lg' onClick={() => setManualEntry(false)}>
              Scan QR code instead
            </Button>
          )}
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
