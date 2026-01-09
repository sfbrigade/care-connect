import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, Container, Loader, Stack, Text, Title } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Head } from '@unhead/react';
import { StatusCodes } from 'http-status-codes';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import { useFacilityContext } from '@/FacilityContext';
import RegistrationForm from '../RegistrationForm';

function Invite () {
  const { user } = useAuthContext();
  const { facility } = useFacilityContext();
  const { inviteId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSuccess, setSuccess] = useState(false);

  const { data: invite, isLoading, error } = useQuery({
    queryKey: ['invite', inviteId],
    queryFn: async () => {
      const response = await Api.invites.get(inviteId);
      queryClient.setQueryData(['users', 'me'], null);
      return response.data;
    },
    retry: false,
  });

  const onSubmitMutation = useMutation({
    mutationFn: (values) => Api.auth.register({ ...values, inviteId }),
    onSuccess: async (response) => {
      queryClient.setQueryData(['users', 'me'], response.data);
      setSuccess(true);
      setTimeout(() => {
        if (response.data.organizationId === 'sfpd' || response.data.organizationId === 'sfso') {
          navigate('/units', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }, 3000);
    },
    onError: () => window.scrollTo(0, 0),
  });

  function onContinue () {
    if (user?.organizationId === 'sfpd' || user?.organizationId === 'sfso') {
      navigate('/units', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }

  return (
    <>
      <Head>
        <title>Create an account</title>
      </Head>
      <Container>
        {!isSuccess && (
          <Stack>
            <Stack align='center'>
              {/* Logo placeholder */}
              <Stack
                justify='center'
                w='134px'
                h='134px'
                bdrs='50%'
                bg='gray.3'
              >
                <Title align='center' order={3} fw='bold'>{facility?.name}</Title>
              </Stack>
              {/* Title */}
              <Title order={3}>
                Create an account
              </Title>
              {isLoading && <Loader />}
            </Stack>
            {error?.status === StatusCodes.GONE && <Text align='center'>This invite is no longer available.</Text>}
            {!!error && error?.status !== StatusCodes.GONE && <Text align='center'>An error occurred while loading this invite.</Text>}
            {invite && invite.acceptedAt === null && invite.revokedAt === null && (
              <RegistrationForm invite={invite} onSubmitMutation={onSubmitMutation} />
            )}
          </Stack>
        )}
        {isSuccess && (
          <Stack justify='center' h='100vh'>
            <Stack align='center'>
              {/* Logo placeholder */}
              <Stack
                justify='center'
                w='134px'
                h='134px'
                bdrs='50%'
                bg='gray.3'
              >
                <Title align='center' order={3} fw='bold'>{facility?.name}</Title>
              </Stack>
              {/* Title */}
              <Title order={3}>
                Welcome to {facility?.name}, {user?.firstName}.
              </Title>
              <Text align='center' c='dimmed'>
                You will be automatically logged into your account in a few seconds. If not, press Continue.
              </Text>
              <Button fullWidth onClick={onContinue}>Continue</Button>
            </Stack>
          </Stack>
        )}
      </Container>
    </>
  );
}
export default Invite;
