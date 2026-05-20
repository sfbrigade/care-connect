import React, { useState } from 'react';
import { ActionIcon, Box, Group, Stack, Text, Title } from '@mantine/core';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';

import { buildPersonStatusTimeline } from './personStatusTimelineUtils';
import classes from './PersonStatusTimeline.module.css';

function PersonStatusTimeline ({ deflection, viewerMode = 'custody' }) {
  const [opened, setOpened] = useState(true);
  const milestones = buildPersonStatusTimeline(deflection, { viewerMode });

  if (!milestones.length) return null;

  return (
    <Stack gap='md'>
      <Group justify='space-between' align='center' wrap='nowrap'>
        <Title order={3} fw={400}>Timeline</Title>
        <ActionIcon
          aria-label={opened ? 'Collapse timeline' : 'Expand timeline'}
          color='gray'
          onClick={() => setOpened(value => !value)}
          radius='xl'
          size={48}
          variant='light'
        >
          {opened ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
        </ActionIcon>
      </Group>
      {opened && (
        <Stack gap={4} className={classes.list}>
          {milestones.map((milestone, index) => {
            const isLast = index === milestones.length - 1;
            return (
              <Group
                key={milestone.status}
                align='stretch'
                gap='md'
                wrap='nowrap'
                className={classes.item}
                data-active={milestone.active || undefined}
                data-exit={milestone.isExit || undefined}
                data-interrupted={milestone.interrupted || undefined}
                data-last={isLast || undefined}
              >
                <Box className={classes.rail} aria-hidden='true'>
                  <Box className={classes.dot} />
                  {!isLast && <Box className={classes.line} />}
                </Box>
                <Box className={classes.content}>
                  <Text className={classes.label}>{milestone.label}</Text>
                  {milestone.timestamp && (
                    <Group gap='xs' className={classes.meta} wrap='wrap'>
                      <Text size='sm' className={classes.timestamp}>{milestone.timestamp}</Text>
                      {milestone.actor && (
                        <>
                          <Text size='sm' c='gray.5' aria-hidden='true'>&bull;</Text>
                          <Text size='sm' c='dimmed'>{milestone.actor}</Text>
                        </>
                      )}
                    </Group>
                  )}
                </Box>
              </Group>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}

export default PersonStatusTimeline;
