import { useEffect, useState } from 'react';
import { Box, Button, Container, Group, Loader, Modal, SegmentedControl, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import classNames from 'classnames';

import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import QRScanner from '@/components/QRScanner';

import classes from './ScanCodeModal.module.css';

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
  const [errorMessages, setErrorMessages] = useState([]);

  useEffect(() => {
    if (!opened) return;
    setIsLoading(false);
    setManualEntry(false);
    setCodes(['']);
    setScanAccepted(false);
    setErrorMessages([]);
  }, [opened]);

  async function handleScan (text, forQrCamera = false) {
    await onScan(text);
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
      const results = await onManualSubmitCodes(trimmedCodes);
      const failed = results.filter((r) => r.error);
      if (failed.length === 0) {
        handleClose();
      } else {
        setCodes(failed.map((r) => r.code));
        setErrorMessages(failed.map((r) => r.error));
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
    setErrorMessages([]);
    onClose();
  }

  if (!opened) {
    return null;
  }

  function handleCodeChange (index, value) {
    setCodes((prev) => prev.map((code, codeIndex) => (codeIndex === index ? value : code)));
    setErrorMessages((prev) => prev.map((msg, i) => (i === index ? undefined : msg)));
  }

  function handleAddCodeField () {
    setCodes((prev) => [...prev, '']);
    setErrorMessages((prev) => [...prev, undefined]);
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
        <form onSubmit={handleManualSubmit}>
          <Box className={classNames(classes.scanRoot, { [classes['scanRoot--scan']]: !manualEntry })}>
            {!manualEntry && (
              <QRScanner
                onScanSuccess={(text) => handleScan(text, true)}
                autoStart
                fullScreen
                prompt={prompt}
                _debugScanPhase={_debugScanPhase}
              />
            )}
            <Header className={classes.scanHeader}>
              <Group justify='flex-end' w='100%' mt='xl'>
                <IconButtonLink
                  variant={manualEntry ? undefined : 'primary'}
                  color={manualEntry ? undefined : 'dark.5'}
                  icon={IconX}
                  onClick={handleClose}
                />
              </Group>
            </Header>
            <Stack gap='xl' className={classes.scanControlsOverlay}>
              <SegmentedControl
                classNames={{
                  root: classes.segmentedControlRoot,
                  indicator: classes.segmentedControlIndicator,
                  label: classes.segmentedControlLabel,
                }}
                size='lg'
                value={String(manualEntry)}
                onChange={(value) => setManualEntry(value === 'true')}
                data={[
                  { value: 'false', label: 'Scan QR code' },
                  { value: 'true', label: 'Type code' },
                ]}
              />
              {manualEntry && (
                <Container>
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
                        <TextInput
                          key={index}
                          placeholder={manualEntryInputPlaceholder || 'Enter transfer code'}
                          value={code}
                          onChange={(e) => handleCodeChange(index, e.currentTarget.value)}
                          inputMode='numeric'
                          pattern='[0-9]*'
                          maxLength={6}
                          autoFocus={index === 0}
                          error={errorMessages[index]}
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
                    </Group>
                  </Stack>
                </Container>
              )}
            </Stack>
            {!manualEntry && (
              <Box className={classes.scanFooter}>
                {prompt && (
                  <Text c='white' ta='center' fw={500} size='lg' maw={300} mx='auto'>
                    {prompt}
                  </Text>
                )}
              </Box>
            )}
            <Box className={classes.scanDoneButton}>
              {manualEntry
                ? (
                  <Button
                    type='submit'
                    disabled={!canSubmit}
                  >
                    Submit
                  </Button>
                  )
                : (
                  <Button
                    size='lg'
                    radius='xl'
                    disabled={!scanAccepted}
                    onClick={handleClose}
                  >
                    Done
                  </Button>
                  )}
            </Box>
          </Box>
        </form>
      )}
    </Modal>
  );
}

export default ScanCodeModal;
