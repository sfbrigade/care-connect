import { Alert, Anchor, Text } from '@mantine/core';
import { IconBellOff } from '@tabler/icons-react';

import { useAuthContext } from '@/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { formatUSPhone } from '@/utils/phone';

// Recovery banner (D3): shown when the user has opted out of SMS at the carrier
// level (replied STOP). A carrier opt-out can't be undone from the app — only the
// user texting START clears it — so this explains how to resume. `smsOptedOutAt`
// is set/cleared by the inbound handler (Phase 8). Persistent (no dismiss): it
// stays until the opt-out is actually resolved (texting START clears the flag).

// CareConnect's inbound toll-free number (E.164, for the sms: link) and support
// address, shown so an opted-out user knows where to text START / get help. Kept as
// literals: the TFN is the single leased number, and the support address matches the
// rest of the app (e.g. UserProfilePage). Move to shared config/env if either varies.
const CARECONNECT_TFN = '+18337225979';
const SUPPORT_EMAIL = 'careconnect@sfgov.org';

function SmsOptOutBanner () {
  const { user } = useAuthContext();
  const { isCustody } = useUserRole();

  if (!user?.smsOptedOutAt || !isCustody) return null;

  const registeredNumber = formatUSPhone(user.phoneNumber) || 'your number';

  return (
    <Alert icon={<IconBellOff />} color='yellow' variant='light' title='SMS notifications are blocked'>
      <Text size='sm'>
        CareConnect is currently blocked from sending text messages to{' '}
        <Text span fw={600}>{registeredNumber}</Text>. To re-enable notifications, text <Text span ff='monospace' fw={600}>START</Text> to
        CareConnect at <Anchor href={`sms:${CARECONNECT_TFN}`}>{formatUSPhone(CARECONNECT_TFN)}</Anchor>,
        or contact <Anchor href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</Anchor> for further assistance.
      </Text>
    </Alert>
  );
}

export default SmsOptOutBanner;
