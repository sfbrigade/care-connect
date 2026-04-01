import { useState, useEffect } from 'react';
import { Accordion, ActionIcon, Box, Group, Popover, Stack, Text, Title } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

function StatusAccordion ({ sections, groupedDeflections, defaultOpen, renderCard }) {
  // track counts of each status to determine if a section should be open
  const [, setCounts] = useState({});
  const [value, setValue] = useState();

  useEffect(() => {
    // get the old counts, then calculate the new counts
    let oldCounts;
    const newCounts = sections.reduce((acc, s) => {
      acc[s.status] = groupedDeflections[s.status]?.length ?? 0;
      return acc;
    }, {});
    setCounts((prev) => {
      oldCounts = prev;
      return newCounts;
    });
    // if the section is already open, or the count has increased, open it
    // if a section is empty, close it (it will then also be disabled)
    setValue((oldValue) => {
      if (!oldValue) {
        return defaultOpen ?? sections
          .filter(s => (groupedDeflections[s.status]?.length ?? 0) > 0)
          .map(s => s.status);
      }
      const newValue = [];
      sections.forEach((s) => {
        if (newCounts[s.status] > 0) {
          if (oldValue.includes(s.status) || newCounts[s.status] > (oldCounts[s.status] ?? 0)) {
            newValue.push(s.status);
          }
        }
      });
      return newValue;
    });
  }, [defaultOpen, sections, groupedDeflections]);

  return (
    <Accordion variant='contained' multiple value={value} onChange={setValue} chevronPosition='left'>
      {sections.map(({ status, label, tooltip }) => {
        const items = groupedDeflections[status] ?? [];
        return (
          <Accordion.Item key={status} value={status}>
            <Accordion.Control disabled={items.length === 0}>
              <Group justify='space-between' wrap='nowrap'>
                <Title order={4}>{label}: {items.length}</Title>
                {tooltip && (
                  <Box onClick={(e) => e.stopPropagation()}>
                    <Popover width={250} withArrow radius='md' shadow='none'>
                      <Popover.Target>
                        <ActionIcon variant='transparent' c='gray.5' size='md' mr='sm'>
                          <IconInfoCircle size={22} />
                        </ActionIcon>
                      </Popover.Target>
                      <Popover.Dropdown p='md' bg='dark' style={{ border: 'none' }}>
                        <Text size='sm' c='white'>{tooltip}</Text>
                      </Popover.Dropdown>
                    </Popover>
                  </Box>
                )}
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap='md'>
                {items.map(d => renderCard(d))}
                {items.length === 0 && (
                  <Text c='dimmed' size='sm'>None</Text>
                )}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        );
      })}
    </Accordion>
  );
}

export default StatusAccordion;
