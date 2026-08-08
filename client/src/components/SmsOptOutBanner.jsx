import { Alert, Anchor, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

import { useAuthContext } from '@/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { formatUSPhone } from '@/utils/phone';

// Warning banner shown when the user has opted out of SMS at the carrier level
// (usually by typing STOP). The only way to re-enable is for the user to text
// START or UNSTOP.

const CARECONNECT_TFN = '+18337225979';
const SUPPORT_EMAIL = 'careconnect@sfgov.org';

function SmsOptOutBanner () {
  const { user } = useAuthContext();
  const { isCustody } = useUserRole();

  if (!user?.smsOptedOutAt || !isCustody) return null;

  const registeredNumber = formatUSPhone(user.phoneNumber) || 'your number';

  return (
    <Alert icon={<IconAlertCircle />} color='yellow' variant='light' radius='lg' title='' styles={{ root: { backgroundColor: 'var(--mantine-color-yellow-1)' } }}>
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
