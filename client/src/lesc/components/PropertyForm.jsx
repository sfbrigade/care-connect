import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Head } from '@unhead/react';
import { IconArrowLeft } from '@tabler/icons-react';
import { Button, Chip, Container, Fieldset, Group, Stack, Text, Textarea, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useFacilityContext } from '@/FacilityContext';
import Api from '@/Api';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import PhotoInput from '@/components/PhotoInput';

const initialValues = {
  property: '',
  propertyDetails: '',
};

function PropertyForm () {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get('isNew') === 'true';
  const queryClient = useQueryClient();
  const { facility } = useFacilityContext();
  const [isInitialized, setInitialized] = useState(false);
  const { t } = useTranslation();

  const { data: incident } = useQuery({
    queryKey: ['facilities', facility.id, 'active-incident'],
    queryFn: () => Api.facilities.activeIncident(facility.id).then(response => response.data),
  });

  const { data: deflection, isLoading } = useQuery({
    queryKey: ['deflections', id],
    queryFn: () => Api.deflections.get(id).then(response => response.data),
  });

  const form = useForm({
    mode: 'uncontrolled',
    initialValues,
  });

  useEffect(() => {
    if (!isLoading) {
      if (deflection) {
        form.setInitialValues({
          property: deflection.property,
          propertyDetails: deflection.propertyDetails,
        });
        form.reset();
      }
      setInitialized(true);
    }
  }, [isLoading, deflection]);

  const onSubmitMutation = useMutation({
    mutationFn: (data) => Api.deflections.update(id, data),
    onSuccess: async (response) => {
      await queryClient.setQueryData(['deflections', id], response.data);
      const cachedDeflections = queryClient.getQueryData(['deflections', incident?.id, 'active']);
      if (cachedDeflections) {
        const updatedDeflections = [...cachedDeflections];
        updatedDeflections[updatedDeflections.findIndex(deflection => deflection.id === id)] = response.data;
        queryClient.setQueryData(['deflections', incident?.id, 'active'], updatedDeflections);
      }
      navigate(`/holds/${id}`);
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: (data) => Api.deflections.propertyPhotos.create(id, data),
    onSuccess: async (response) => {
      await queryClient.setQueryData(['deflections', id], response.data);
      const cachedDeflections = queryClient.getQueryData(['deflections', incident?.id, 'active']);
      if (cachedDeflections) {
        const updatedDeflections = [...cachedDeflections];
        updatedDeflections[updatedDeflections.findIndex(deflection => deflection.id === id)] = response.data;
        queryClient.setQueryData(['deflections', incident?.id, 'active'], updatedDeflections);
      }
    },
  });

  function onUploadPhoto (file) {
    if (file) {
      uploadPhotoMutation.mutate({ file });
    }
  }

  return (
    <>
      <Head>
        <title>Personal property</title>
      </Head>
      <Header>
        <Group w='100%' justify='space-between'>
          <IconButtonLink icon={IconArrowLeft} to={isNew ? `/holds/${id}/deflection?isNew=true` : `/holds/${id}`} />
          {isNew && <Text c='dimmed' size='lg'>Step 3 of 3</Text>}
        </Group>
      </Header>
      <Container>
        <Group gap='xs' mb='xs'>
          <Text size='md'>Incident {incident?.cadNumber ?? ''}</Text>
          <Text c='gray.5' size='md'>•</Text>
          <Text size='md' c='dimmed'>Hold {deflection?.id?.substring(0, 3) ?? ''}</Text>
        </Group>
        <Title order={2} mb='xs'>Personal property</Title>
        <Text c='dimmed' size='md' mb='xl'>Document any personal property the subject is bringing.</Text>
        <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
          <Fieldset disabled={!isInitialized} variant='unstyled'>
            <Stack gap='xl'>
              <Chip.Group
                key={form.key('property')}
                {...form.getInputProps('property')}
              >
                <Group gap='sm'>
                  {['NONE', 'SMALL', 'MEDIUM', 'LARGE'].map(value => (
                    <Chip
                      key={value}
                      value={value}
                      size='lg'
                    >
                      {t(`property.${value}`)}
                    </Chip>
                  ))}
                </Group>
              </Chip.Group>
              <PhotoInput
                label='Photo'
                id='file'
                name='file'
                onChange={onUploadPhoto}
              >
                <Button variant='secondary' size='md' mt='md'>Take or upload photo</Button>
              </PhotoInput>
              <Textarea
                key={form.key('propertyDetails')}
                {...form.getInputProps('propertyDetails')}
                label='Description'
                placeholder='E.g., black backpack with clothing and toiletries.'
              />
              <Button type='submit' mb='xl'>
                {isNew ? 'Save details' : 'Save property'}
              </Button>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default PropertyForm;
