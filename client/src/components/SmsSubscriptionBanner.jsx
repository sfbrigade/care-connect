import { Alert, Anchor, Button, Group, Stack, Text } from '@mantine/core';
import { IconBellRinging } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

// Home-screen prompt to set up SMS notifications. Shown only to CUSTODY-role users
// (the v1 audience — NOT gated on work mode; a pure-FIELD user never receives
// notifications). Keys on whether the user has a VERIFIED NUMBER (not on event
// subscriptions): the banner's job is "get set up," and once you have a number you
// manage what you receive — including nothing — from the settings/account pages,
// so it shouldn't reappear when you disable event types. Dismissal state is
// persisted server-side (cross-device): ✕ → permanent; "Remind me later" → 24h,
// reappears once, then permanent (enforced by the /me/sms-banner route). Clicking
// "Subscribe" does NOT dismiss.
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
    !user.phoneVerifiedAt &&
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
      icon={<IconBellRinging color='var(--mantine-color-indigo-6)' />}
      color='gray'
      variant='light'
      radius='lg'
      withCloseButton
      closeButtonLabel='Dismiss'
      onClose={() => bannerActionMutation.mutate('dismiss')}
      styles={{ root: { backgroundColor: 'var(--mantine-color-gray-1)' } }}
    >
      <Stack gap='xs'>
        <Text size='sm'>Subscribe to SMS notifications for CareConnect status updates.</Text>
        <Group gap='md'>
          <Anchor component='button' type='button' onClick={() => bannerActionMutation.mutate('remind')}>
            Remind me later
          </Anchor>
          <Button variant='secondary' size='sm' onClick={onSubscribe}>
            Subscribe
          </Button>
        </Group>
      </Stack>
    </Alert>
  );
}

export default SmsSubscriptionBanner;
