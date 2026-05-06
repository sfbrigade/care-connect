// Throwaway PoC: live continuous PDF417 scanning of the back of a US driver's license.
// Spec reference: docs/barcode-scanning-guide.md.

import { useEffect, useRef, useState } from 'react';
import { Box, Button, Code, Group, Stack, Text, Title } from '@mantine/core';
import { useNavigate } from 'react-router';
import { BrowserPDF417Reader } from '@zxing/browser';

// Viewfinder geometry. Kept here so the JSX overlay and the alignment-analysis
// math operate on identical numbers — change here, both follow.
const VIEWFINDER_MAX_WIDTH = 600;
const VIEWFINDER_VIEWPORT_FRACTION = 0.85;
const CARD_ASPECT = 1.586;
// Barcode region within the card, expressed as fractions of viewfinder dimensions.
const BARCODE_INSET_X = 0.08;
const BARCODE_INSET_TOP = 0.08;
const BARCODE_HEIGHT_FRACTION = 0.32;

// Alignment heuristic: per-row sign changes around the row mean, BUT scored
// as the minimum density across the row's three column-thirds (so a barcode
// that's partially off-screen scores low because at least one third is empty).
// Aggregated across rows by median for robustness against glare bands.
//   - PDF417 fully in frame: all thirds dense → min ≈ 0.20–0.35
//   - PDF417 partially out:  one third sparse → min ≈ 0.00–0.05
//   - Cluttered scene:       at most one busy column → min ≈ 0.00–0.05
const ALIGNMENT_ENTER_THRESHOLD = 0.20;
const ALIGNMENT_EXIT_THRESHOLD = 0.12;
const ALIGNMENT_AMPLITUDE_MIN = 60; // sum of RGB delta from row mean to count as a transition
const ANALYSIS_INTERVAL_MS = 400; // less frequent so ZXing has more frames to itself
const ANALYSIS_TARGET_WIDTH = 240;

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
  const analysisCanvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [decoded, setDecoded] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [alignment, setAlignment] = useState({ density: 0, aligned: false });

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

  // Throttled analysis: every ~200ms, crop the barcode region of the current
  // video frame to a small canvas and count strong horizontal gradients.
  // High density => barcode-shaped content is in the viewfinder.
  useEffect(() => {
    if (decoded) return undefined;

    const intervalId = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || !video.videoWidth || !video.videoHeight) return;

      // Cover-fit math: figure out which sub-rect of the source video the user
      // actually sees in the viewport.
      const dispW = window.innerWidth;
      const dispH = window.innerHeight;
      const videoW = video.videoWidth;
      const videoH = video.videoHeight;
      const dispAspect = dispW / dispH;
      const videoAspect = videoW / videoH;
      let visX = 0;
      let visY = 0;
      let visW = videoW;
      let visH = videoH;
      if (videoAspect > dispAspect) {
        visW = videoH * dispAspect;
        visX = (videoW - visW) / 2;
      } else {
        visH = videoW / dispAspect;
        visY = (videoH - visH) / 2;
      }

      // Viewfinder rectangle in viewport (CSS) coordinates — mirrors JSX below.
      const vfW = Math.min(dispW * VIEWFINDER_VIEWPORT_FRACTION, VIEWFINDER_MAX_WIDTH);
      const vfH = vfW / CARD_ASPECT;
      const vfX = (dispW - vfW) / 2;
      const vfY = (dispH - vfH) / 2;

      // Barcode sub-rectangle in viewport coordinates.
      const barX = vfX + vfW * BARCODE_INSET_X;
      const barY = vfY + vfH * BARCODE_INSET_TOP;
      const barW = vfW * (1 - 2 * BARCODE_INSET_X);
      const barH = vfH * BARCODE_HEIGHT_FRACTION;

      // Map viewport coords → source video coords.
      const scaleX = visW / dispW;
      const scaleY = visH / dispH;
      const srcX = visX + barX * scaleX;
      const srcY = visY + barY * scaleY;
      const srcW = barW * scaleX;
      const srcH = barH * scaleY;
      if (srcW < 4 || srcH < 4) return;

      // Down-sample crop into a small reusable canvas. ~10K pixels max.
      if (!analysisCanvasRef.current) {
        analysisCanvasRef.current = document.createElement('canvas');
      }
      const canvas = analysisCanvasRef.current;
      const targetW = ANALYSIS_TARGET_WIDTH;
      const targetH = Math.max(4, Math.round(targetW * (srcH / srcW)));
      if (canvas.width !== targetW) canvas.width = targetW;
      if (canvas.height !== targetH) canvas.height = targetH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      try {
        ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, targetW, targetH);
      } catch {
        return; // video not ready / cross-origin tainting on first paint
      }
      let data;
      try {
        data = ctx.getImageData(0, 0, targetW, targetH).data;
      } catch {
        return;
      }

      // Per-row sign changes around the row mean, partitioned into three
      // column-bands. Row score = min density across its three thirds, so a
      // partially-framed barcode (one empty band) scores low even if the
      // visible bands are dense. Aggregated across rows by median.
      const w = targetW;
      const h = targetH;
      const t1End = Math.floor(w / 3);
      const t2End = Math.floor((2 * w) / 3);
      const t1Width = t1End;
      const t2Width = t2End - t1End;
      const t3Width = w - t2End;
      const rowMinDensities = new Array(h);
      for (let y = 0; y < h; y++) {
        const rowStart = y * w * 4;
        let sum = 0;
        for (let x = 0; x < w; x++) {
          const i = rowStart + x * 4;
          sum += data[i] + data[i + 1] + data[i + 2];
        }
        const mean = sum / w;

        let c1 = 0;
        let c2 = 0;
        let c3 = 0;
        let lastSign = 0;
        for (let x = 0; x < w; x++) {
          const i = rowStart + x * 4;
          const v = data[i] + data[i + 1] + data[i + 2];
          const delta = v - mean;
          if (Math.abs(delta) < ALIGNMENT_AMPLITUDE_MIN) continue;
          const sign = delta > 0 ? 1 : -1;
          if (lastSign !== 0 && sign !== lastSign) {
            if (x < t1End) c1++;
            else if (x < t2End) c2++;
            else c3++;
          }
          lastSign = sign;
        }

        const d1 = t1Width > 0 ? c1 / t1Width : 0;
        const d2 = t2Width > 0 ? c2 / t2Width : 0;
        const d3 = t3Width > 0 ? c3 / t3Width : 0;
        rowMinDensities[y] = Math.min(d1, d2, d3);
      }
      // Median is more robust to a single glare-washed row than mean.
      rowMinDensities.sort((a, b) => a - b);
      const density = rowMinDensities[Math.floor(rowMinDensities.length / 2)] ?? 0;

      setAlignment(prev => {
        const aligned = prev.aligned
          ? density > ALIGNMENT_EXIT_THRESHOLD
          : density > ALIGNMENT_ENTER_THRESHOLD;
        return { density, aligned };
      });
    }, ANALYSIS_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [decoded]);

  function rescan () {
    setAlignment({ density: 0, aligned: false });
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
                border: alignment.aligned
                  ? '3px dashed rgba(64,220,120,0.95)'
                  : '2px dashed rgba(255,255,255,0.75)',
                borderRadius: 12,
                transition: 'border-color 120ms ease',
              }}
            />
            <Box
              style={{
                position: 'absolute',
                top: '8%',
                left: '8%',
                right: '8%',
                height: '32%',
                border: alignment.aligned
                  ? '2px solid rgba(64,220,120,1)'
                  : '2px solid rgba(255,255,255,0.95)',
                borderRadius: 4,
                backgroundImage: alignment.aligned
                  ? 'repeating-linear-gradient(90deg, rgba(64,220,120,0.7) 0 2px, transparent 2px 5px)'
                  : 'repeating-linear-gradient(90deg, rgba(255,255,255,0.55) 0 2px, transparent 2px 5px)',
                transition: 'border-color 120ms ease',
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

          {/* Debug HUD: shows the alignment heuristic's density value so we
              can tune ENTER/EXIT thresholds against real-world conditions.
              Remove once we trust the signal. */}
          <Box
            pos='absolute'
            bottom={16}
            left={16}
            right={16}
            style={{ zIndex: 2, pointerEvents: 'none' }}
          >
            <Box
              p='xs'
              style={{
                background: 'rgba(0,0,0,0.6)',
                borderRadius: 8,
                color: 'white',
                fontFamily: 'monospace',
                fontSize: 12,
                lineHeight: 1.4,
              }}
            >
              <div>density: {alignment.density.toFixed(3)}</div>
              <div style={{ color: alignment.aligned ? 'rgb(64,220,120)' : 'rgba(255,255,255,0.7)' }}>
                {alignment.aligned ? '● aligned (hold still)' : '○ not aligned'}
              </div>
            </Box>
          </Box>
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
