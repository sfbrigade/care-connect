import { ActionIcon, Group, Text, ThemeIcon } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

import { buildAutoCancelledHoldsMessage } from './holdsViewModel';

function HoldsAutoCancelledNotice ({ count, onClose }) {
  return (
    <Group
      align='center'
      gap='12px'
      justify='space-between'
      px='16px'
      py='12px'
      wrap='nowrap'
      style={{
        borderRadius: '16px',
        backgroundColor: '#FFE3E3',
      }}
    >
      <ThemeIcon color='red.6' radius='xl' size={32}>
        <IconX size={16} stroke={2.5} />
      </ThemeIcon>
      <Text c='dark.9' flex={1} fz='16px' fw={400} lh='24px' pr='8px'>
        {buildAutoCancelledHoldsMessage(count)}
      </Text>
      <ActionIcon
        aria-label='Dismiss auto-canceled holds notice'
        color='gray.5'
        onClick={onClose}
        radius='xl'
        size={20}
        variant='subtle'
        styles={{
          root: {
            backgroundColor: 'transparent',
            minWidth: '20px',
            minHeight: '20px',
          },
        }}
      >
        <IconX size={20} />
      </ActionIcon>
    </Group>
  );
}

export default HoldsAutoCancelledNotice;
