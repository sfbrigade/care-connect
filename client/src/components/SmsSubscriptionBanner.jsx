import { Alert, Anchor, Group, Stack, Text } from '@mantine/core';
import { IconBell } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import { isSmsSubscribed } from '@/components/NotificationPreferenceToggles';
import { useUserRole } from '@/hooks/useUserRole';

// Home-screen prompt inviting eligible users to enroll in SMS notifications.
// Shown only to CUSTODY-role users (the v1 notification audience — NOT gated on
// work mode; a pure-FIELD user never receives notifications, so we don't prompt
// them). Shows while the user is NOT yet subscribed (verified + ≥1 event) and
// hasn't dismissed it. Dismissal state is persisted server-side (cross-device):
//   ✕ → permanent; "Remind me later" → 24h, reappears once, then permanent
//   (enforced by the /me/sms-banner route). Clicking "Subscribe" does NOT dismiss
//   — the banner simply stops showing once the user actually becomes subscribed,
//   so abandoning the flow leaves the prompt in place.
function SmsSubscriptionBanner () {
  const { user } = useAuthContext();
  const { isCustody } = useUserRole();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
    !isSmsSubscribed(user) &&
    !user.smsBannerDismissedAt &&
    !remindActive
  );

  if (!shouldShow) return null;

  function onSubscribe () {
    // Just navigate into the enrollment flow — do NOT dismiss. The banner stops
    // showing once the user actually becomes subscribed; bailing keeps it around.
    navigate('/profile/notifications/enroll');
  }

  return (
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
  );
}

export default SmsSubscriptionBanner;
