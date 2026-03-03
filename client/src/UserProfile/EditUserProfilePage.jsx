import { useEffect, useState } from 'react';
import { Anchor, Button, Container, Fieldset, Group, Radio, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Head } from '@unhead/react';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useToast } from '@/components/ToastContext';

import UnitSelector from '../UnitSelector';

function EditUserProfilePage () {
  const { user } = useAuthContext();
  const userId = user?.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [rankValue, setRankValue] = useState();
  const [prop115Value, setProp115Value] = useState('false');

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      badgeNumber: '',
      unitId: '',
      titleId: '',
      prop115Certified: false,
    }
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => Api.users.get(userId),
  });

  function handleProp115Change (value) {
    const radioValue = value === 'true';
    setProp115Value(value);
    form.setValues({ prop115Certified: radioValue });
  }

  function handleRankChange (value) {
    setRankValue(value);
    form.setValues({ titleId: value });
  }

  // const { data: units } = useQuery({
  //   queryKey: ['organizations', form.getValues().organizationId, 'units'],
  //   queryFn: () => Api.organizations.units.index(form.getValues().organizationId).then(response => response.data),
  //   enabled: !!form.getValues().organizationId,
  // });

  const { data: titles } = useQuery({
    queryKey: ['organizations', form.getValues().organizationId, 'titles'],
    queryFn: () => Api.organizations.titles.index(form.getValues().organizationId).then(response => response.data),
    enabled: !!form.getValues().organizationId,
  });

  useEffect(() => {
    if (response) {
      form.setInitialValues({
        ...response.data,
        password: '',
      });
      form.reset();

      setRankValue(response?.data?.titleId);
      setProp115Value(response?.data?.prop115Certified.toString());
    }
  }, [response]);

  const onSubmitMutation = useMutation({
    mutationFn: (values) => Api.users.update(userId, values),
    onSuccess: (response) => {
      if (userId === user?.id) {
        queryClient.setQueryData(['users', 'me'], response.data);
      }
      showToast('Your profile has been updated', 'success');
      navigate('/profile');
    },
    onError: (error) => {
      form.setErrors(error);
      showToast('Something went wrong. We couldn’t save these details. Please try again.', 'error');
    },
    onSettled: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  });

  function handleUnitSelectorData (data) {
    form.setValues({ unitId: data });
  }

  return (
    <>
      <Head>
        <title>Edit position details</title>
      </Head>
      <Header>
        <Group w='100%' justify='space-between'>
          <IconButtonLink icon={IconArrowLeft} to='/profile' />
        </Group>
      </Header>
      <Container>
        <Stack>
          <Title>Edit position details</Title>
          <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
            <Fieldset disabled={isLoading} variant='unstyled'>
              <Stack>
                <TextInput
                  {...form.getInputProps('badgeNumber')}
                  key={form.key('badgeNumber')}
                  label='Star Number'
                  placeholder='Enter badge or star number'
                  disabled
                />
                <UnitSelector
                  sendUnitIdToParent={handleUnitSelectorData}
                  title={false}
                  show_btn={false}
                />
                <Radio.Group
                  onChange={handleRankChange}
                  label='Rank'
                  value={rankValue}
                >
                  <Stack>
                    {titles?.map((title) => (
                      <Radio
                        label={title.name}
                        value={title.id}
                        key={title.id}
                      />
                    ))}
                  </Stack>
                </Radio.Group>

                <Radio.Group
                  onChange={handleProp115Change}
                  label='Prop 115 certification'
                  value={prop115Value}
                >
                  <Stack>
                    <Radio label='Yes' value='true' />
                    <Radio label='No' value='false' />
                  </Stack>
                </Radio.Group>

                <Group>
                  <Button variant='light' color='red'>Cancel</Button>
                  <Button variant='secondary' type='submit'>Save changes</Button>
                </Group>
              </Stack>
            </Fieldset>
          </form>
          <Text size='sm' ta='center' c='gray.5'>
            For assistance with profile updates, please contact <Anchor href='mailto:careconnect@sfgov.org'>careconnect@sfgov.org</Anchor>
          </Text>
        </Stack>
      </Container>
    </>
  );
}

export default EditUserProfilePage;
