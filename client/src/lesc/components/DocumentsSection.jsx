import React from 'react';
import { ActionIcon, Accordion, Group, Menu, Paper, Stack, Text, Title } from '@mantine/core';
import { IconDots, IconDownload, IconExternalLink, IconFileText, IconMail } from '@tabler/icons-react';
import { DateTime } from 'luxon';

export function formatDocumentUpdatedAt (value, now = DateTime.now()) {
  if (!value) return null;

  const dateTime = DateTime.fromISO(value);
  if (!dateTime.isValid) return null;

  const localDateTime = dateTime.toLocal();
  const today = now.toLocal().startOf('day');
  const documentDay = localDateTime.startOf('day');
  const time = localDateTime.toLocaleString(DateTime.TIME_SIMPLE);

  if (documentDay.equals(today)) return time;
  if (documentDay.equals(today.minus({ days: 1 }))) return `Yesterday, ${time}`;
  return `${localDateTime.toFormat('LLLL d')}, ${time}`;
}

function DocumentMenuItem ({ icon: Icon, onClick, loading, children }) {
  return (
    <Menu.Item
      leftSection={<Icon size={20} color='var(--mantine-color-gray-7)' />}
      onClick={onClick}
      disabled={loading}
    >
      {children}
    </Menu.Item>
  );
}

function DocumentRow ({ document }) {
  const actions = document.actions ?? {};
  const handleView = () => actions.view?.();
  const handleDownload = () => actions.download?.();
  const handleEmail = () => actions.email?.();
  const updatedAt = formatDocumentUpdatedAt(document.updatedAt);
  const updatedLabel = updatedAt ? `Updated ${updatedAt}` : null;

  return (
    <Paper component={Group} bg='white' radius='lg' px='md' py='sm' gap='sm' wrap='nowrap' align='center'>
      <IconFileText size={20} color='var(--mantine-color-gray-7)' />
      <Stack gap={0} flex={1} miw={0}>
        <Text size='md' truncate>{document.title}</Text>
        {updatedLabel && (
          <Text size='sm' c='dimmed' truncate>{updatedLabel}</Text>
        )}
      </Stack>
      <Menu position='bottom-end' width={280} withinPortal>
        <Menu.Target>
          <ActionIcon
            variant='subtle'
            color='gray'
            radius='xl'
            aria-label={`${document.title} actions`}
          >
            <IconDots size={20} color='var(--mantine-color-gray-5)' />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          {actions.view && (
            <DocumentMenuItem icon={IconExternalLink} onClick={handleView}>
              View
            </DocumentMenuItem>
          )}
          {actions.download && (
            <DocumentMenuItem icon={IconDownload} onClick={handleDownload}>
              Download
            </DocumentMenuItem>
          )}
          {actions.email && (
            <DocumentMenuItem icon={IconMail} onClick={handleEmail} loading={document.emailLoading}>
              Email to myself
            </DocumentMenuItem>
          )}
        </Menu.Dropdown>
      </Menu>
    </Paper>
  );
}

export default function DocumentsSection ({ documents }) {
  if (!documents?.length) return null;

  return (
    <Accordion.Item value='documents'>
      <Accordion.Control>
        <Title order={3}>Documents</Title>
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap={6}>
          {documents.map(document => (
            <DocumentRow key={document.id} document={document} />
          ))}
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
