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
  const [isLarge, setIsLarge] = useState(false);

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
    onValuesChange: (values) => {
      setIsLarge(values.property === 'LARGE');
    },
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
    mutationFn: (file) => Api.propertyPhotos.create({ deflectionId: id, file }),
    onSuccess: async (response) => {
      const cachedDeflection = queryClient.getQueryData(['deflections', id]);
      if (cachedDeflection) {
        cachedDeflection.propertyPhotos = [...(cachedDeflection.propertyPhotos ?? []), response.data];
        queryClient.setQueryData(['deflections', id], cachedDeflection);
      }
      const cachedDeflections = queryClient.getQueryData(['deflections', incident?.id, 'active']);
      if (cachedDeflections) {
        const updatedDeflections = [...cachedDeflections];
        updatedDeflections[updatedDeflections.findIndex(deflection => deflection.id === id)] = cachedDeflection;
        queryClient.setQueryData(['deflections', incident?.id, 'active'], updatedDeflections);
      }
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (propertyPhotoId) => Api.propertyPhotos.delete(propertyPhotoId),
    onSuccess: async (response, propertyPhotoId) => {
      const cachedDeflection = queryClient.getQueryData(['deflections', id]);
      if (cachedDeflection) {
        cachedDeflection.propertyPhotos = cachedDeflection.propertyPhotos.filter(propertyPhoto => propertyPhoto.id !== propertyPhotoId);
        queryClient.setQueryData(['deflections', id], cachedDeflection);
      }
      const cachedDeflections = queryClient.getQueryData(['deflections', incident?.id, 'active']);
      if (cachedDeflections) {
        const updatedDeflections = [...cachedDeflections];
        updatedDeflections[updatedDeflections.findIndex(deflection => deflection.id === id)] = cachedDeflection;
        queryClient.setQueryData(['deflections', incident?.id, 'active'], updatedDeflections);
      }
    },
  });

  function onChangePhoto (photoId, file) {
    if (!photoId && file) {
      uploadPhotoMutation.mutate(file);
    }
    if (photoId && !file) {
      deletePhotoMutation.mutate(photoId);
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
          {isNew && onSubmitMutation.isIdle && <Text c='dimmed' size='lg'>Step 3 of 3</Text>}
          {onSubmitMutation.isPending && <Text c='dimmed' size='lg'>Saving...</Text>}
          {onSubmitMutation.isSuccess && <Text c='teal.6' size='lg'>Changes saved</Text>}
        </Group>
      </Header>
      <Container>
        <Group gap='xs' mb='xs'>
          <Text size='md'>Incident {incident ? String(incident.id).padStart(6, '0') : ''}</Text>
          <Text c='gray.5' size='md'>•</Text>
          <Text size='md' c='dimmed'>Hold {deflection ? String(deflection.id).padStart(6, '0') : ''}</Text>
        </Group>
        <Title order={2} mb='xs'>Personal property</Title>
        <Text c='dimmed' size='md' mb='xl'>Document any personal property the subject is bringing.</Text>
        <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
          <Fieldset disabled={!isInitialized || !onSubmitMutation.isIdle} variant='unstyled'>
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
              {(isLarge && facility?.name === 'RESET') && (
                <Group gap='xs'>
                  <Text size='sm' c='red'>
                    This may exceed {facility?.name} property limits (~10 gallons). Please confirm with {facility?.name} staff.
                  </Text>
                  <Button size='md' mt='md' variant='primary' onClick={() => { window.location.href = `tel:${facility?.phone}`; }}>Call {facility?.name}</Button>
                </Group>

              )}
              {!!deflection?.propertyPhotos?.length && (
                <Group gap='xs'>
                  {deflection.propertyPhotos.map(photo => (
                    <PhotoInput
                      key={photo.id}
                      label='Photo'
                      id='file'
                      name='file'
                      value={photo.file}
                      valueUrl={photo.fileUrl}
                      onChange={(file) => onChangePhoto(photo.id, file)}
                    >
                      <Button variant='secondary' size='md' mt='md'>Take or upload photo</Button>
                    </PhotoInput>
                  ))}
                </Group>
              )}
              {!deflection?.propertyPhotos?.length && (
                <PhotoInput
                  label='Photo'
                  id='file'
                  name='file'
                  onChange={(file) => onChangePhoto(null, file)}
                >
                  <Button variant='secondary' size='md' mt='md'>Take or upload photo</Button>
                </PhotoInput>
              )}
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
