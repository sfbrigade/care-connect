import { Button, Menu } from '@mantine/core';
import { IconBellRinging, IconBellOff, IconCheck } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import { useToast } from '@/components/ToastContext';

// SMS Mute/Unmute control in app header. Displayed only
// if user has enrolled a verified phone.
function SmsNotificationMenu () {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const setEnabledMutation = useMutation({
    mutationFn: (notificationsEnabled) => Api.users.update(user.id, { notificationsEnabled }),
    onSuccess: (response, notificationsEnabled) => {
      queryClient.setQueryData(['users', 'me'], (old) => ({ ...(old ?? {}), ...response.data }));
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      showToast(notificationsEnabled ? 'SMS notifications resumed' : 'SMS notifications paused', 'success');
    },
    onError: () => showToast('Couldn’t update SMS notifications', 'error', 4000, 'Please try again.'),
  });

  if (!user?.phoneVerifiedAt) return null;

  const muted = !user.notificationsEnabled;

  function setEnabled (next) {
    if (next === user.notificationsEnabled) return;
    setEnabledMutation.mutate(next);
  }

  return (
    <Menu position='bottom-end' width={220} withinPortal>
      <Menu.Target>
        <Button
          variant='default'
          radius='xl'
          size='xs'
          leftSection={muted ? <IconBellOff size={18} /> : <IconBellRinging size={18} />}
          aria-label={muted ? 'SMS notifications paused' : 'SMS notifications active'}
        >
          SMS
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconBellRinging size={18} color='var(--mantine-color-gray-6)' />}
          rightSection={!muted ? <IconCheck size={16} color='var(--mantine-color-blue-6)' /> : null}
          onClick={() => setEnabled(true)}
        >
          Enable SMS
        </Menu.Item>
        <Menu.Item
          leftSection={<IconBellOff size={18} color='var(--mantine-color-gray-6)' />}
          rightSection={muted ? <IconCheck size={16} color='var(--mantine-color-blue-6)' /> : null}
          onClick={() => setEnabled(false)}
        >
          Pause SMS
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

export default SmsNotificationMenu;
