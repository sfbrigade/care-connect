import { Box, Group, Text } from '@mantine/core';
import { IconCircleCheckFilled, IconLock } from '@tabler/icons-react';
import { QRCodeSVG } from 'qrcode.react';

function LockedQRCode ({ value, variant, size = 160 }) {
  const dimmed = !!variant;

  return (
    <Box pos='relative'>
      <Box opacity={dimmed ? 0.1 : 1}>
        <QRCodeSVG value={value} size={size} />
      </Box>
      {variant === 'locked' && (
        <Group pos='absolute' w={size / 2} h={size / 2} bg='white' style={{ borderRadius: '50%' }} top={size / 4} left={size / 4} justify='center' align='center'>
          <IconLock size={24} color='black' />
        </Group>
      )}
      {variant === 'handedOff' && (
        <Group pos='absolute' top={0} left={0} w={size} h={size} justify='center' align='center'>
          <Group gap={4} bg='white' px='md' py='xs' style={{ borderRadius: 999 }} wrap='nowrap'>
            <IconCircleCheckFilled size={18} color='var(--mantine-color-teal-6)' />
            <Text size='sm' fw={500} c='teal.6'>Handed off</Text>
          </Group>
        </Group>
      )}
    </Box>
  );
}

export default LockedQRCode;
