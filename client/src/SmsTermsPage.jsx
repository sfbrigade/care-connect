import { Anchor, Container, List, Stack, Text, Title } from '@mantine/core';
import { Head } from '@unhead/react';

// Public SMS-program terms for the CareConnect text-notification service (D6/D9).
// Linked from the enrollment consent step. Deliberately reachable without auth so
// carrier / toll-free verification reviewers can view it (it's not in any
// AUTH/ROLE-protected path list, so AppRedirects leaves it public).
const SUPPORT_EMAIL = 'careconnect@sfgov.org';
const SF_PRIVACY_URL = 'https://www.sf.gov/information/privacy-policy-sfgov';

function Keyword ({ children }) {
  return <Text span ff='monospace' fw={600}>{children}</Text>;
}

function SmsTermsPage () {
  return (
    <>
      <Head>
        <title>CareConnect SMS Terms</title>
      </Head>
      <Container py='xl'>
        <Stack>
          <Title order={2}>CareConnect SMS Notifications — Terms</Title>

          <Text>
            CareConnect sends SMS text notifications to authorized staff members who opt in.
            By enrolling a mobile number, you agree to these terms.
          </Text>

          <List spacing='sm' size='sm'>
            <List.Item>Message frequency varies.</List.Item>
            <List.Item>Message and data rates may apply. CareConnect does not charge for messages, but your mobile carrier may.</List.Item>
            <List.Item>Opt out at any time by replying <Keyword>STOP</Keyword> to any message; reply <Keyword>START</Keyword> to resume.</List.Item>
            <List.Item>For help, reply <Keyword>HELP</Keyword> or contact <Anchor href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</Anchor>.</List.Item>
            <List.Item>Mobile carriers are not liable for delayed or undelivered messages.</List.Item>
          </List>

          <Text size='sm'>
            For how the City handles your information, see the{' '}
            <Anchor href={SF_PRIVACY_URL} target='_blank' rel='noopener noreferrer'>San Francisco Privacy Policy</Anchor>.
          </Text>
        </Stack>
      </Container>
    </>
  );
}

export default SmsTermsPage;
