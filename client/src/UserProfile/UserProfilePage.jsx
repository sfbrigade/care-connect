import { Anchor, Button, Box, Container, Divider, Group, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { Head } from '@unhead/react';
import { Link } from 'react-router';

import { useAuthContext } from '@/AuthContext';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { isSmsSubscribed, summarizeEvents } from '@/components/NotificationPreferenceToggles';
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

function SectionHeader ({ title, to }) {
  return (
    <Group justify='space-between'>
      <Title order={3}>{title}</Title>
      <Button component={Link} to={to} variant='default' size='xs'>Edit</Button>
    </Group>
  );
}

function UserProfilePage () {
  const { user } = useAuthContext();
  const { isCustody } = useUserRole();

  const isSfpdOrSfso = user.organizationId === 'sfpd' || user.organizationId === 'sfso';
  const isSubscribed = isSmsSubscribed(user);
  const preferencesSummary = summarizeEvents(user.subscribedEvents);

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
              <Stack gap='sm'>
                <SectionHeader title='Position details' to='/profile/edit' />
                <Field label='Star number' value={user.badgeNumber} />
                <Field label='Unit' value={formatUnitName(user.unit?.name)} />
                {user.organizationId === 'sfso' && (
                  <>
                    <Field label='Rank' value={user.title?.name} />
                    <Field label='Prop 115 certification' value={user.prop115Certified ? 'Yes' : 'No'} />
                  </>
                )}
              </Stack>
              <Divider />
            </>
          )}

          <Stack gap='sm'>
            <SectionHeader title='Contact details' to='/profile/contact' />
            <Field label='Email address' value={user.email} />
            <Field label='Mobile number' value={user.phoneNumber ? formatUSPhone(user.phoneNumber) : 'Not set'} />
          </Stack>

          {isCustody && (
            <>
              <Divider />
              <Stack gap='sm'>
                <SectionHeader
                  title='SMS notifications'
                  to={isSubscribed ? '/profile/notifications' : '/profile/notifications/enroll'}
                />
                <Field label='SMS subscription' value={isSubscribed ? 'On' : 'Off'} />
                {isSubscribed && <Field label='Preferences' value={preferencesSummary} />}
              </Stack>
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
