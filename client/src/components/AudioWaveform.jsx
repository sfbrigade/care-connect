/* global AudioContext, requestAnimationFrame, cancelAnimationFrame */
import { useEffect, useRef } from 'react';
import { Box } from '@mantine/core';

const BAR_COUNT = 24;
const BAR_WIDTH = 3;
const BAR_GAP = 2;
const HEIGHT = 32;
const MIN_BAR_HEIGHT = 2;

function AudioWaveform ({ stream }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (!stream || !canvasRef.current) return;

    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const totalWidth = BAR_COUNT * (BAR_WIDTH + BAR_GAP) - BAR_GAP;
    canvas.width = totalWidth;
    canvas.height = HEIGHT;

    function draw () {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < BAR_COUNT; i++) {
        const dataIndex = Math.floor(i * dataArray.length / BAR_COUNT);
        const value = dataArray[dataIndex] / 255;
        const barHeight = Math.max(MIN_BAR_HEIGHT, value * HEIGHT);
        const x = i * (BAR_WIDTH + BAR_GAP);
        const y = (HEIGHT - barHeight) / 2;

        ctx.fillStyle = value > 0.05 ? '#228be6' : '#adb5bd';
        ctx.beginPath();
        ctx.roundRect(x, y, BAR_WIDTH, barHeight, 1);
        ctx.fill();
      }
    }

    draw();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      source.disconnect();
      audioCtx.close();
    };
  }, [stream]);

  return (
    <Box style={{ display: 'flex', alignItems: 'center' }}>
      <canvas
        ref={canvasRef}
        style={{ height: HEIGHT, width: BAR_COUNT * (BAR_WIDTH + BAR_GAP) - BAR_GAP }}
      />
    </Box>
  );
}

export default AudioWaveform;
