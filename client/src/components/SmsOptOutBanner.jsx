import { Alert, Text } from '@mantine/core';
import { IconBellOff } from '@tabler/icons-react';

import { useAuthContext } from '@/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

// Recovery banner (D3): shown when the user has opted out of SMS at the carrier
// level (replied STOP). A carrier opt-out can't be undone from the app — only the
// user texting START clears it — so this explains how to resume. `smsOptedOutAt`
// is set/cleared by the inbound handler (Phase 8). Persistent (no dismiss): it
// stays until the opt-out is actually resolved (texting START clears the flag).
function SmsOptOutBanner () {
  const { user } = useAuthContext();
  const { isCustody } = useUserRole();

  if (!user?.smsOptedOutAt || !isCustody) return null;

  return (
    <Alert icon={<IconBellOff />} color='yellow' variant='light' title='SMS notifications are turned off'>
      <Text size='sm'>
        You replied STOP, so CareConnect can’t text you. To start receiving alerts again,
        reply START to the CareConnect text messages. (Turning notifications on in the app
        won’t override this.)
      </Text>
    </Alert>
  );
}

export default SmsOptOutBanner;
