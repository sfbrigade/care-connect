import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Anchor, Button, Container, Group, Loader, Table, Text, Title } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { Head } from '@unhead/react';

import Api from '../../Api';
import Pagination from '../../../core/components/Pagination';

function AdminInvitesList () {
  const queryClient = useQueryClient();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const page = parseInt(params.get('page') ?? '1', 10);
  const [lastPage, setLastPage] = useState(1);

  const { data: invites, isLoading } = useQuery({
    queryKey: ['invites', page],
    queryFn: async () => {
      const response = await Api.invites.index(page);
      setLastPage(Api.calculateLastPage(response, page));
      return response.data;
    }
  });

  function revoke (invite) {
    const name = `${invite.firstName} ${invite.lastName}`.trim();
    const nameAndEmail = `${name} <${invite.email}>`.trim();
    modals.openConfirmModal({
      title: (<Title order={3}>Are you sure?</Title>),
      centered: true,
      children: (
        <Text>Are you sure you wish to <b>revoke</b> the invite to<br /><b>{nameAndEmail}?</b></Text>
      ),
      labels: {
        confirm: 'Yes',
        cancel: 'No',
      },
      onConfirm: async () => {
        const response = await Api.invites.revoke(invite.id);
        if (response.status === 200) {
          queryClient.setQueryData(['invites', page], invites.filter((i) => i.id !== invite.id));
        }
      }
    });
  }

  function resend (invite) {
    const name = `${invite.firstName} ${invite.lastName}`.trim();
    const nameAndEmail = `${name} <${invite.email}>`.trim();
    modals.openConfirmModal({
      title: (<Title order={3}>Are you sure?</Title>),
      centered: true,
      children: (
        <Text>Are you sure you wish to <b>resend</b> the invite to<br /><b>{nameAndEmail}?</b></Text>
      ),
      labels: {
        confirm: 'Yes',
        cancel: 'No',
      },
      onConfirm: async () => {
        const response = await Api.invites.resend(invite.id);
        if (response.status === 200) {
          for (const inv of invites) {
            if (inv.id === invite.id) {
              inv.updatedAt = response.data.updatedAt;
              break;
            }
          }
          queryClient.setQueryData(['invites', page], [...invites]);
        }
      }
    });
  }

  return (
    <>
      <Head>
        <title>Manage Invites</title>
      </Head>
      <Container>
        <Title mb='md'>Manage Invites</Title>
        <Group mb='lg'>
          <Button component={Link} to='new'>
            Invite a new User
          </Button>
        </Group>
        <Title order={2}>Invites</Title>
        <Table.ScrollContainer mb='lg'>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w='15%'>First name</Table.Th>
                <Table.Th w='15%'>Last name</Table.Th>
                <Table.Th w='20%'>Email</Table.Th>
                <Table.Th w='20%'>Invited on</Table.Th>
                <Table.Th w='30%'>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading &&
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Group justify='center' py='lg'><Loader /></Group>
                  </Table.Td>
                </Table.Tr>}
              {!isLoading && invites?.map((invite) => (
                <Table.Tr key={invite.id}>
                  <Table.Td>{invite.firstName}</Table.Td>
                  <Table.Td>{invite.lastName}</Table.Td>
                  <Table.Td>
                    <Anchor href={`mailto:${invite.email}`}>{invite.email}</Anchor>
                  </Table.Td>
                  <Table.Td>{DateTime.fromISO(invite.updatedAt).toLocaleString()}</Table.Td>
                  <Table.Td>
                    <Anchor component='button' onClick={() => resend(invite)}>
                      Resend&nbsp;Invite
                    </Anchor>
                    &nbsp;|&nbsp;
                    <Anchor component='button' onClick={() => revoke(invite)}>
                      Revoke&nbsp;Invite
                    </Anchor>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          <Pagination page={page} lastPage={lastPage} />
        </Table.ScrollContainer>
      </Container>
    </>
  );
}
export default AdminInvitesList;
