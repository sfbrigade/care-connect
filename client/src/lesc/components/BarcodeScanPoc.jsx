// Throwaway PoC: live continuous PDF417 scanning of the back of a US driver's license.
// Spec reference: docs/barcode-scanning-guide.md.

import { useEffect, useRef, useState } from 'react';
import { Box, Button, Code, Group, Stack, Text, Title } from '@mantine/core';
import { useNavigate } from 'react-router';
import { BrowserPDF417Reader } from '@zxing/browser';

// AAMVA field codes that are commonly populated. Anything unrecognized gets shown
// as raw key/value below the structured panel for debugging.
const FIELD_LABELS = {
  DAC: 'First name',
  DAD: 'Middle name',
  DCS: 'Last name',
  DBB: 'Date of birth',
  DBA: 'Expiration',
  DBD: 'Issue date',
  DAG: 'Address line 1',
  DAH: 'Address line 2',
  DAI: 'City',
  DAJ: 'State',
  DAK: 'Postal code',
  DAQ: 'License number',
  DAU: 'Height',
  DAY: 'Eye color',
  DBC: 'Sex',
};

function parseAamva (payload) {
  const fields = {};
  const lines = payload.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 4) continue;
    const code = trimmed.slice(0, 3);
    if (!/^[A-Z]{3}$/.test(code)) continue;
    fields[code] = trimmed.slice(3).trim();
  }
  return fields;
}

function BarcodeScanPoc () {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState(null);
  const [decoded, setDecoded] = useState(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (decoded) return;
    let cancelled = false;
    const reader = new BrowserPDF417Reader();

    async function start () {
      setScanning(true);
      try {
        // Try to find the rear camera explicitly. Labels are empty until the user
        // grants permission once, so on a cold start we fall back to facingMode.
        let deviceId;
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const rear = devices.find(
            d => d.kind === 'videoinput' && /back|rear|environment/i.test(d.label)
          );
          deviceId = rear?.deviceId;
        } catch {
          // ignore
        }

        const constraints = deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: 'environment' } };

        // Bump resolution: PDF417 is dense and the default is too low.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { ...constraints, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        controlsRef.current = await reader.decodeFromStream(
          stream,
          videoRef.current,
          (result, err, controls) => {
            if (cancelled) return;
            if (result) {
              const text = result.getText();
              const parsed = parseAamva(text);
              setDecoded({ raw: text, fields: parsed });
              setScanning(false);
              try { navigator.vibrate?.(50); } catch { /* not supported */ }
              controls.stop();
              const s = videoRef.current?.srcObject;
              if (s) s.getTracks().forEach(t => t.stop());
            }
            // err here is mostly "no barcode in this frame" — ignore.
          }
        );
      } catch (e) {
        if (!cancelled) setError(e?.message ?? 'Could not access camera.');
        setScanning(false);
      }
    }

    start();

    return () => {
      cancelled = true;
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
      const s = videoRef.current?.srcObject;
      if (s) s.getTracks().forEach(t => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [decoded]);

  function rescan () {
    setDecoded(null);
    setError(null);
  }

  const labeled = decoded
    ? Object.entries(decoded.fields)
      .filter(([code]) => FIELD_LABELS[code])
      .map(([code, value]) => ({ code, label: FIELD_LABELS[code], value }))
    : [];
  const unlabeled = decoded
    ? Object.entries(decoded.fields)
      .filter(([code]) => !FIELD_LABELS[code])
    : [];

  return (
    <Box
      pos='fixed'
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg='black'
      style={{ zIndex: 1000, overflow: 'auto' }}
    >
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: decoded ? 'none' : 'block',
        }}
      />

      {!decoded && (
        <>
          {/* Skeleton overlay: landscape card outline (aspect 1.586) with the
              barcode region marked in the upper portion. Helps the user orient
              the card so PDF417 lands roughly horizontally in frame. */}
          <Box
            pos='absolute'
            top='50%'
            left='50%'
            style={{
              transform: 'translate(-50%, -50%)',
              width: 'min(85vw, 600px)',
              aspectRatio: 1.586,
              zIndex: 1,
              pointerEvents: 'none',
            }}
          >
            <Box
              style={{
                position: 'absolute',
                inset: 0,
                border: '2px dashed rgba(255,255,255,0.75)',
                borderRadius: 12,
              }}
            />
            <Box
              style={{
                position: 'absolute',
                top: '8%',
                left: '8%',
                right: '8%',
                height: '32%',
                border: '2px solid rgba(255,255,255,0.95)',
                borderRadius: 4,
                backgroundImage:
                  'repeating-linear-gradient(90deg, rgba(255,255,255,0.55) 0 2px, transparent 2px 5px)',
              }}
            />
            <Text
              c='white'
              size='xs'
              style={{
                position: 'absolute',
                bottom: 8,
                left: 0,
                right: 0,
                textAlign: 'center',
                textShadow: '0 0 4px rgba(0,0,0,0.6)',
              }}
            >
              Align back of ID — barcode in the highlighted area
            </Text>
          </Box>

          <Group
            pos='absolute'
            top={16}
            left={16}
            right={16}
            justify='space-between'
            style={{ zIndex: 2 }}
          >
            <Button variant='filled' color='dark' onClick={() => navigate(-1)}>
              Close
            </Button>
            {scanning && (
              <Text c='white' size='sm'>
                Point the camera at the barcode on the back of the license
              </Text>
            )}
          </Group>
        </>
      )}

      {error && (
        <Stack
          pos='absolute'
          top='50%'
          left='50%'
          style={{ transform: 'translate(-50%, -50%)', zIndex: 2 }}
          gap='md'
          align='center'
        >
          <Text c='white'>{error}</Text>
          <Button onClick={() => navigate(-1)}>Close</Button>
        </Stack>
      )}

      {decoded && (
        <Box p='md' style={{ position: 'relative', zIndex: 2, color: 'white' }}>
          <Stack gap='md'>
            <Title order={3} c='white'>Decoded</Title>
            <Stack gap='xs'>
              {labeled.length === 0 && (
                <Text c='gray.4'>No recognized AAMVA fields. See raw payload below.</Text>
              )}
              {labeled.map(({ code, label, value }) => (
                <Group key={code} gap='sm' wrap='nowrap'>
                  <Text c='gray.4' miw={140}>{label}</Text>
                  <Text c='white' fw={600}>{value}</Text>
                  <Text c='gray.6' size='xs'>({code})</Text>
                </Group>
              ))}
            </Stack>

            <details>
              <summary style={{ color: 'var(--mantine-color-gray-4)', cursor: 'pointer' }}>
                Show raw decoded data
              </summary>
              <Stack gap='md' mt='sm'>
                {unlabeled.length > 0 && (
                  <Stack gap='xs'>
                    <Text c='gray.4' size='sm'>Other fields</Text>
                    {unlabeled.map(([code, value]) => (
                      <Group key={code} gap='sm' wrap='nowrap'>
                        <Text c='gray.5' miw={60}>{code}</Text>
                        <Text c='white'>{value}</Text>
                      </Group>
                    ))}
                  </Stack>
                )}
                <Stack gap='xs'>
                  <Text c='gray.4' size='sm'>Raw payload</Text>
                  <Code block style={{ whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto', color: '#000' }}>
                    {decoded.raw}
                  </Code>
                </Stack>
              </Stack>
            </details>

            <Group>
              <Button onClick={rescan}>Scan again</Button>
              <Button variant='subtle' color='gray' onClick={() => navigate(-1)}>
                Done
              </Button>
            </Group>
          </Stack>
        </Box>
      )}
    </Box>
  );
}

export default BarcodeScanPoc;
