import { Box, Group } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { QRCodeSVG } from 'qrcode.react';

function LockedQRCode ({ value, locked = false, size = 160 }) {
  return (
    <Box pos='relative'>
      <Box opacity={locked ? 0.1 : 1}>
        <QRCodeSVG value={value} size={size} />
      </Box>
      {locked && (
        <Group pos='absolute' w={size / 2} h={size / 2} bg='white' style={{ borderRadius: '50%' }} top={size / 4} left={size / 4} justify='center' align='center'>
          <IconLock size={24} color='black' />
        </Group>
      )}
    </Box>
  );
}

export default LockedQRCode;
