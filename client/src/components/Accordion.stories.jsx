import { Accordion, ActionIcon, Box, Group, Popover, Text, Title } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

export default {
  title: 'Components/Accordion',
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
};

const items = [
  { value: 'one', label: 'Section One', content: 'Content for section one.' },
  { value: 'two', label: 'Section Two', content: 'Content for section two.' },
  { value: 'three', label: 'Section Three', content: 'Content for section three.' },
];

const itemsWithTooltips = [
  { value: 'invited', label: 'Invited', count: 2, tooltip: 'Users who have been sent an invite but have not yet accepted.', content: 'Pending invite cards would go here.' },
  { value: 'active', label: 'Active', count: 5, tooltip: 'Users with active accounts who can sign in.', content: 'Active user cards would go here.' },
  { value: 'disabled', label: 'Disabled', count: 1, tooltip: 'Accounts that have been disabled. They can be re-enabled.', content: 'Disabled user cards would go here.' },
];

export const Default = {
  render: () => (
    <Accordion variant='default' multiple defaultValue={['one']}>
      {items.map((item) => (
        <Accordion.Item key={item.value} value={item.value}>
          <Accordion.Control>{item.label}</Accordion.Control>
          <Accordion.Panel><Text size='sm'>{item.content}</Text></Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  ),
};

export const Section = {
  render: () => (
    <Accordion variant='section' multiple defaultValue={['one']}>
      {items.map((item) => (
        <Accordion.Item key={item.value} value={item.value}>
          <Accordion.Control>{item.label}</Accordion.Control>
          <Accordion.Panel><Text size='sm'>{item.content}</Text></Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  ),
};

export const Contained = {
  render: () => (
    <Accordion variant='contained' multiple defaultValue={['one']} chevronPosition='left'>
      {items.map((item) => (
        <Accordion.Item key={item.value} value={item.value}>
          <Accordion.Control>{item.label}</Accordion.Control>
          <Accordion.Panel><Text size='sm'>{item.content}</Text></Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  ),
};

export const ContainedWithTooltips = {
  render: () => (
    <Accordion variant='contained' multiple defaultValue={['invited', 'active']} chevronPosition='left'>
      {itemsWithTooltips.map((item) => (
        <Accordion.Item key={item.value} value={item.value}>
          <Group wrap='nowrap' gap={0}>
            <Accordion.Control>
              <Title order={4}>{item.label}: {item.count}</Title>
            </Accordion.Control>
            <Box onClick={(e) => e.stopPropagation()} mr='sm'>
              <Popover width={250} withArrow radius='md' shadow='none'>
                <Popover.Target>
                  <ActionIcon variant='transparent' c='gray.5' size='md'>
                    <IconInfoCircle size={22} />
                  </ActionIcon>
                </Popover.Target>
                <Popover.Dropdown p='md' bg='dark' style={{ border: 'none' }}>
                  <Text size='sm' c='white'>{item.tooltip}</Text>
                </Popover.Dropdown>
              </Popover>
            </Box>
          </Group>
          <Accordion.Panel><Text size='sm'>{item.content}</Text></Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  ),
};
