import { ActionIcon, Group, Text } from '@mantine/core';
import { IconAlertCircle, IconX } from '@tabler/icons-react';

import { buildAutoCanceledHoldsMessage } from './holdsViewModel';
import classes from './HoldsAutoCanceledNotice.module.css';

function HoldsAutoCanceledNotice ({ count, message, onClose }) {
  return (
    <Group
      align='center'
      bg='red.1'
      className={classes.notice}
      gap='md'
      justify='space-between'
      px='lg'
      py='md'
      wrap='nowrap'
    >
      <IconAlertCircle size={32} color='var(--mantine-color-red-6)' />
      <Text c='dark.9' flex={1} fz='md' fw={400} lh='md' pr='sm'>
        {message || buildAutoCanceledHoldsMessage(count)}
      </Text>
      <ActionIcon
        aria-label='Dismiss auto-canceled holds notice'
        color='gray.5'
        onClick={onClose}
        radius='xl'
        size='lg'
        variant='subtle'
      >
        <IconX size={20} />
      </ActionIcon>
    </Group>
  );
}

export default HoldsAutoCanceledNotice;
