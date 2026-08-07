import { useState } from 'react';
import { ActionIcon, Alert, Anchor, Button, Box, Collapse, Container, Divider, Group, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle, IconArrowLeft, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { Head } from '@unhead/react';
import { Link } from 'react-router';

import { useAuthContext } from '@/AuthContext';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { summarizeEvents } from '@/components/NotificationPreferenceToggles';
import { useUserRole } from '@/hooks/useUserRole';
import { formatUnitName } from '@/utils/unit';
import { formatUSPhone } from '@/utils/phone';

function Field ({ label, value }) {
  return (
    <Box>
      <Text size='md' c='gray.6'>{label}</Text>
      <Text size='md'>{value}</Text>
    </Box>
  );
}

// Collapsible profile section: title + caret toggle, with the fields and an
// "Edit" button (bottom-left) inside the collapsible body.
function Section ({ title, editTo, editLabel = 'Edit', children }) {
  const [open, setOpen] = useState(true);
  return (
    <Stack gap='sm'>
      <Group justify='space-between' wrap='nowrap'>
        <Title order={3}>{title}</Title>
        <ActionIcon
          variant='subtle'
          color='gray'
          onClick={() => setOpen((o) => !o)}
          aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`}
          aria-expanded={open}
        >
          {open ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
        </ActionIcon>
      </Group>
      <Collapse in={open}>
        <Stack gap='sm'>
          {children}
          <Button component={Link} to={editTo} variant='secondary' size='xs' style={{ alignSelf: 'flex-start' }}>
            {editLabel}
          </Button>
        </Stack>
      </Collapse>
    </Stack>
  );
}

// Slim inline warning for the SMS section: flags an external blocker (no verified
// number, or a carrier opt-out) without the full Settings-page banner.
function SlimWarning ({ children }) {
  return (
    <Alert color='yellow' variant='light' radius='lg' w='fit-content' px='md' py='xs'>
      {/* Lay out the icon + text ourselves in a centered row — Alert's own icon
          slot top-aligns and can't be reliably re-centered. */}
      <Group gap='xs' wrap='nowrap' align='center'>
        <IconAlertTriangle size={18} color='var(--mantine-color-yellow-7)' style={{ flexShrink: 0 }} />
        <Text size='sm'>{children}</Text>
      </Group>
    </Alert>
  );
}

function UserProfilePage () {
  const { user } = useAuthContext();
  const { isCustody } = useUserRole();

  const isSfpdOrSfso = user.organizationId === 'sfpd' || user.organizationId === 'sfso';

  // SMS notifications state (Custody only). Config surfaces only once there's a VERIFIED
  // number — an unverified/pending number is treated as "no number" (shown as a Set-up
  // CTA), since there's nothing to deliver to. When verified: the mute state +
  // subscriptions, with a warning banner if the number is carrier opted-out.
  const smsVerified = !!user.phoneVerifiedAt;
  const smsOptedOut = !!user.smsOptedOutAt;
  const smsUnmuted = !!user.notificationsEnabled;
  const subscriptionsSummary = summarizeEvents(user.subscribedEvents);

  return (
    <>
      <Head>
        <title>User Profile</title>
      </Head>
      <Header>
        <Group w='100%' justify='space-between'>
          <IconButtonLink icon={IconArrowLeft} to='/' aria-label='Go back' />
        </Group>
      </Header>
      <Container>
        <Stack>
          <Title order={2}>{user.firstName} {user.lastName}</Title>

          {isSfpdOrSfso && (
            <>
              <Section title='Position details' editTo='/profile/edit'>
                <Field label='Star number' value={user.badgeNumber} />
                <Field label='Unit' value={formatUnitName(user.unit?.name)} />
                {user.organizationId === 'sfso' && (
                  <>
                    <Field label='Rank' value={user.title?.name} />
                    <Field label='Prop 115 certification' value={user.prop115Certified ? 'Yes' : 'No'} />
                  </>
                )}
              </Section>
              <Divider />
            </>
          )}

          <Section title='Contact details' editTo='/profile/contact'>
            <Field label='Email address' value={user.email} />
            {/* Only a VERIFIED number counts as on-file; an unverified/pending number
                reads as "Not set" (Approach A), consistent with the SMS section. */}
            <Field label='Mobile number' value={user.phoneVerifiedAt ? formatUSPhone(user.phoneNumber) : 'Not set'} />
          </Section>

          {isCustody && (
            <>
              <Divider />
              <Section
                title='SMS notifications'
                editTo={smsVerified ? '/profile/notifications' : '/profile/notifications/enroll'}
                editLabel={smsVerified ? 'Edit' : 'Set up SMS notifications'}
              >
                {smsVerified && (
                  <>
                    {smsOptedOut && (
                      <SlimWarning>SMS notifications to {formatUSPhone(user.phoneNumber) || 'your number'} are blocked.</SlimWarning>
                    )}
                    <Field label='Status' value={smsUnmuted ? 'Unmuted' : 'Muted'} />
                    {smsUnmuted && <Field label='Subscriptions' value={subscriptionsSummary || 'None'} />}
                  </>
                )}
              </Section>
            </>
          )}

          <Text size='sm' ta='center' c='gray.5'>
            For assistance with profile updates, please contact <Anchor href='mailto:careconnect@sfgov.org' underline='always'>careconnect@sfgov.org</Anchor>
          </Text>
        </Stack>
      </Container>
    </>
  );
}

export default UserProfilePage;
