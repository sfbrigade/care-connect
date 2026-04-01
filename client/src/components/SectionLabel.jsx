import { ActionIcon, Popover, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconInfoCircle } from '@tabler/icons-react';

function SectionLabel ({ label, info }) {
  const [opened, { toggle, close }] = useDisclosure(false);

  return (
    <>
      <Text size='lg'>{label}</Text>
      {info && (
        <Popover opened={opened} onClose={close} position='bottom' withArrow>
          <Popover.Target>
            <ActionIcon
              variant='transparent'
              color='gray'
              size='sm'
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggle(); }}
              style={{ position: 'absolute', right: '0.5rem' }}
            >
              <IconInfoCircle size={20} />
            </ActionIcon>
          </Popover.Target>
          <Popover.Dropdown bg='dark.7' style={{ border: 'none', maxWidth: 280 }}>
            <Text size='sm' c='white' style={{ whiteSpace: 'normal' }}>{info}</Text>
          </Popover.Dropdown>
        </Popover>
      )}
    </>
  );
}

export default SectionLabel;
