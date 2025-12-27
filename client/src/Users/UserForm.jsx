import { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router';
import { Alert, Button, Checkbox, Container, Fieldset, Group, Stack, TextInput, Title } from '@mantine/core';
import { hasLength, isEmail, isNotEmpty, useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import PhotoInput from '@/components/PhotoInput';

function UserForm () {
  const authContext = useAuthContext();
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = params.userId ?? authContext.user?.id;

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      picture: '',
      pictureUrl: '',
      isAdmin: false,
      badgeNumber: '',
      rank: '',
      unit: '',
    },
    validate: {
      firstName: isNotEmpty('First name is required.'),
      lastName: isNotEmpty('Last name is required.'),
      email: isEmail('Please enter a valid email address.'),
      password: (value) => value ? hasLength({ min: 12 }, 'Passwords must be at least 12 characters.') : null,
    },
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => Api.users.get(userId),
    enabled: !!userId,
  });

  useEffect(() => {
    if (response) {
      form.initialize({
        ...response.data,
        password: '',
      });
    }
  }, [response]);

  const onSubmitMutation = useMutation({
    mutationFn: (values) => Api.users.update(userId, values),
    onMutate: () => setSuccess(false),
    onSuccess: (response) => {
      if (userId === authContext.user?.id) {
        authContext.setUser(response.data);
      }
      setSuccess(true);
    },
    onError: (errors) => form.setErrors(errors),
    onSettled: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  });
  const [success, setSuccess] = useState(false);

  function handleCancel () {
    // Navigate back to previous page
    navigate(-1);
  }

  async function onLogout (event) {
    event.preventDefault();
    await Api.auth.logout();
    queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    authContext.setUser(null);
    navigate('/');
  }

  // Don't render if user is not loaded yet or userId is missing
  if (!authContext.user || !userId) {
    return null;
  }

  return (
    <>
      <Head>
        <title>My Account</title>
      </Head>
      <Container>
        <Title mb='md'>My Account</Title>
        <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
          <Fieldset disabled={isLoading} variant='unstyled'>
            <Stack w={{ base: '100%', xs: 320 }}>
              {location.state?.flash && <Alert>{location.state?.flash}</Alert>}
              {form.errors?._form && <Alert color='red'>{form.errors._form}</Alert>}
              {success && <Alert>Your account has been updated!</Alert>}
              <PhotoInput
                {...form.getInputProps('picture')}
                label='Picture'
                valueUrl={form.getValues().pictureUrl}
              />
              <TextInput
                {...form.getInputProps('firstName')}
                key={form.key('firstName')}
                label='First name'
              />
              <TextInput
                {...form.getInputProps('lastName')}
                key={form.key('lastName')}
                label='Last name'
              />
              <TextInput
                {...form.getInputProps('email')}
                key={form.key('email')}
                label='Email'
                type='email'
              />
              <TextInput
                {...form.getInputProps('password')}
                key={form.key('password')}
                label='Password'
                type='password'
                autoComplete='new-password'
              />
              <TextInput
                {...form.getInputProps('badgeNumber')}
                key={form.key('badgeNumber')}
                label='Badge Number / Star Number'
                placeholder='Enter badge or star number'
              />
              <TextInput
                {...form.getInputProps('rank')}
                key={form.key('rank')}
                label='Rank'
                placeholder='Enter rank'
              />
              <TextInput
                {...form.getInputProps('unit')}
                key={form.key('unit')}
                label='Unit'
                placeholder='Enter unit'
              />
              {authContext.user?.isAdmin && (
                <Checkbox
                  {...form.getInputProps('isAdmin', { type: 'checkbox' })}
                  key={form.key('isAdmin')}
                  label='Is an Administrator?'
                />
              )}
              <Group>
                <Button disabled={onSubmitMutation.isPending} type='submit'>Submit</Button>
                <Button
                  variant='light'
                  onClick={handleCancel}
                  disabled={onSubmitMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant='outline'
                  color='red'
                  onClick={onLogout}
                >
                  Log Out
                </Button>
              </Group>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default UserForm;
