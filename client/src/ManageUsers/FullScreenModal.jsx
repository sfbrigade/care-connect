import { ActionIcon, Container, Group, Modal, Stack, Title } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

import ActionFooter from '@/components/ActionFooter';

function FullScreenModal ({ opened, onClose, subtitle, title, actions, stickyActions, children }) {
  return (
    <Modal opened={opened} onClose={onClose} fullScreen withCloseButton={false}>
      <Container>
        <Stack gap='md'>
          <ActionIcon
            variant='transparent'
            bg='rgb(from var(--mantine-color-gray-6) R G B / 0.1)'
            w={44}
            h={44}
            radius='50%'
            onClick={onClose}
          >
            <IconX size={20} color='black' />
          </ActionIcon>
          <div>
            <Title order={5} c='dimmed'>{subtitle}</Title>
            <Title order={3}>{title}</Title>
          </div>
          {children}
          {actions && !stickyActions && (
            <Group gap='sm'>
              {actions}
            </Group>
          )}
        </Stack>
      </Container>
      {actions && stickyActions && (
        <ActionFooter>
          {actions}
        </ActionFooter>
      )}
    </Modal>
  );
}

export default FullScreenModal;
