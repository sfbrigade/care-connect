import { Alert, Anchor, Button, Group, Stack, Text } from '@mantine/core';
import { IconBellRinging } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

// Banner on home screen that nudges users to enroll in SMS notifications.

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
    isCustody &&  // Update this if we enable SMS notifs for other roles in future
    !user.phoneVerifiedAt &&
    !user.smsBannerDismissedAt &&
    !remindActive
  );

  if (!shouldShow) return null;

  function onSubscribe () {
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
        <Text size='md'>Subscribe to SMS notifications for CareConnect status updates.</Text>
        <Group gap='md'>
          <Anchor size='sm' component='button' type='button' onClick={() => bannerActionMutation.mutate('remind')}>
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
