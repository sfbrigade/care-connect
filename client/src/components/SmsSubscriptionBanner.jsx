import { useState } from 'react';
import { Alert, Anchor, Group, Stack, Text } from '@mantine/core';
import { IconBell } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import SmsEnrollmentModal from '@/components/SmsEnrollmentModal';

// Home-screen prompt inviting eligible users to enroll in SMS notifications.
// Shown only to CUSTODY-role users (the v1 notification audience — NOT gated on
// work mode; a pure-FIELD user never receives notifications, so we don't prompt
// them). Dismissal state is persisted server-side (cross-device):
//   Subscribe / ✕ → permanent; "Remind me later" → 24h, reappears once, then
//   permanent (enforced by the /me/sms-banner route).
function SmsSubscriptionBanner () {
  const { user } = useAuthContext();
  const { isCustody } = useUserRole();
  const queryClient = useQueryClient();
  const [modalOpened, setModalOpened] = useState(false);

  const bannerActionMutation = useMutation({
    mutationFn: (action) => Api.users.smsBannerAction(action),
    onSuccess: (resp) => {
      queryClient.setQueryData(['users', 'me'], (old) => ({ ...(old ?? {}), ...resp.data }));
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    },
  });

  const remindActive = user?.smsBannerRemindAfter && Date.now() < new Date(user.smsBannerRemindAfter).getTime();
  const shouldShow = Boolean(
    user &&
    isCustody &&
    !user.phoneVerifiedAt &&
    !user.smsBannerDismissedAt &&
    !remindActive
  );

  function onSubscribe () {
    // Opens the flow and permanently dismisses the banner (designer notes).
    setModalOpened(true);
    bannerActionMutation.mutate('dismiss');
  }

  return (
    <>
      {shouldShow && (
        <Alert
          icon={<IconBell />}
          color='indigo'
          variant='light'
          withCloseButton
          closeButtonLabel='Dismiss'
          onClose={() => bannerActionMutation.mutate('dismiss')}
          title='Subscribe to SMS notifications'
        >
          <Stack gap='xs'>
            <Text size='sm'>Get notified about CareConnect status updates.</Text>
            <Group gap='lg'>
              <Anchor component='button' type='button' onClick={() => bannerActionMutation.mutate('remind')}>
                Remind me later
              </Anchor>
              <Anchor component='button' type='button' fw={600} onClick={onSubscribe}>
                Subscribe
              </Anchor>
            </Group>
          </Stack>
        </Alert>
      )}
      {/* Rendered outside the shouldShow gate so it survives the banner hiding
          (clicking Subscribe dismisses the banner while the modal stays open). */}
      <SmsEnrollmentModal opened={modalOpened} onClose={() => setModalOpened(false)} />
    </>
  );
}

export default SmsSubscriptionBanner;
