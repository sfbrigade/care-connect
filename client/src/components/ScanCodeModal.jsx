import { useEffect, useState } from 'react';
import { Box, Button, Container, Group, Loader, Modal, Stack, Text, TextInput, Title } from '@mantine/core';

import QRScanner from '@/components/QRScanner';
import { sanitizeManualCodeInput } from './scanCodeModalUtils';
import classes from './ScanCodeModal.module.css';
import SegmentedControl from './SegmentedControl';

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
  const [scanAccepted, setScanAccepted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!opened) return;
    setIsLoading(false);
    setManualEntry(false);
    setCodes(['']);
    setScanAccepted(false);
  }, [opened]);

  async function handleScan (text, forQrCamera = false) {
    try {
      await onScan(text);
    } catch (err) {
      if (forQrCamera) setScanAccepted(false);
      throw err;
    }
    if (forQrCamera) setScanAccepted(true);
  }

  async function handleManualScan (text) {
    setIsLoading(true);
    try {
      await handleScan(text);
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
      } catch (err) {
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
    setScanAccepted(false);
    onClose();
  }

  if (!opened) {
    return null;
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
      closeOnClickOutside={false}
      styles={{
        content: {
          background: 'var(--mantine-color-gray-0)',
          overflow: 'visible',
        },
        body: {
          overflow: 'visible',
        },
      }}
    >
      {isLoading && (
        <Stack align='center' justify='center' h='100dvh'>
          <Loader size='lg' />
          <Text c='dimmed'>{loadingText || 'Processing...'}</Text>
        </Stack>
      )}

      {!isLoading && (
        <Stack
          gap={0}
          h='100dvh'
          miw={0}
          pos='relative'
          style={{
            background: manualEntry ? 'var(--mantine-color-gray-0)' : '#000',
          }}
        >
          {manualEntry && (
            <Box style={{ flexShrink: 0, position: 'relative', zIndex: 20 }}>
              <SegmentedControl
                manualEntry={manualEntry}
                onClose={handleClose}
                onManualEntryChange={setManualEntry}
              />
            </Box>
          )}

          {manualEntry
            ? (
              <Box className={classes.manualFormScroll}>
                <Container pt='md' pb='xl'>
                  <form onSubmit={handleManualSubmit}>
                    <Stack gap='xl'>
                      {manualEntryAllowMultiple
                        ? (
                          <Box>
                            <Text size='xl' c='dimmed'>
                              {manualEntryLabel || 'Enter transfer code'}
                            </Text>
                            <Title order={3}>
                              {manualEntryDescription || 'If the QR code does not work, ask the officer for the transfer code.'}
                            </Title>
                          </Box>
                          )
                        : <Title order={3}>{manualEntryTitle || 'Enter Code'}</Title>}

                      <Stack gap='sm'>
                        {codes.map((code, index) => (
                          <>
                          <TextInput
                            key={index}
                            placeholder={manualEntryInputPlaceholder || 'Enter transfer code'}
                            value={code}
                            onChange={(e) => handleCodeChange(index, e.currentTarget.value)}
                            inputMode='numeric'
                            pattern='[0-9]*'
                            maxLength={6}
                            autoFocus={index === 0}
                          />
                          <Text size='sm' c='dimmed'>{errorMessage}</Text>
                          </>
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
              </Box>
              )
            : (
              <>
                <Box className={classes.scanRoot}>
                  <Box className={classes.scanCameraRegion}>
                    <QRScanner
                      onScanSuccess={(text) => handleScan(text, true)}
                      autoStart
                      fullScreen
                      prompt={prompt}
                      _debugScanPhase={_debugScanPhase}
                    />
                  </Box>

                  <Stack
                    className={classes.scanOverlay}
                    gap={0}
                    align='stretch'
                    justify='flex-start'
                  >
                    <Box className={classes.scanSpacer} />

                    <Stack className={classes.scanFooter} align='center' gap='lg' w='100%'>
                      <Button
                        variant='outline'
                        color={scanAccepted ? 'mantine-color-primary-5' : 'white'}
                        size='lg'
                        radius='xl'
                        disabled={!scanAccepted}
                        onClick={handleClose}
                      >
                        Done
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
                <Box className={classes.scanChromeOverlay}>
                  <SegmentedControl
                    manualEntry={manualEntry}
                    onClose={handleClose}
                    onManualEntryChange={setManualEntry}
                  />
                </Box>
              </>
              )}
        </Stack>
      )}
    </Modal>
  );
}

export default ScanCodeModal;
