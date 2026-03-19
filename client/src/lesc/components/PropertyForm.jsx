import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Head } from '@unhead/react';
import { IconArrowLeft } from '@tabler/icons-react';
import { Anchor, Button, Chip, Container, Fieldset, Group, Input, Stack, Text, Textarea, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useFacilityContext } from '@/FacilityContext';
import Api from '@/Api';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import PhotoInput from '@/components/PhotoInput';
import { HOLDS_TOAST_KEY } from '@/utils/constants';

const initialValues = {
  property: '',
  propertyDetails: '',
};

function getSubjectDisplayName (subject) {
  const name = [
    subject?.firstName,
    subject?.middleInitial,
    subject?.lastName,
  ].filter(Boolean).join(' ');

  return name || 'this person';
}

function PropertyForm () {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get('isNew') === 'true';
  const queryClient = useQueryClient();
  const { facility } = useFacilityContext();
  const { t } = useTranslation();
  const [isLarge, setIsLarge] = useState(false);
  const autoSaveTimerRef = useRef(null);

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
      if (form.initialized) {
        scheduleAutoSave(values);
      }
    },
  });

  useEffect(() => {
    if (!isLoading && !form.initialized) {
      if (deflection) {
        const normalized = normalizeValues({
          property: deflection.property,
          propertyDetails: deflection.propertyDetails,
        });
        form.initialize(normalized);
      }
    }
  }, [isLoading, deflection, form.initialized]);

  useEffect(() => () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
  }, []);

  function normalizeValues (values) {
    return {
      property: values.property ?? '',
      propertyDetails: values.propertyDetails ?? '',
    };
  }

  function scheduleAutoSave (values) {
    const normalized = normalizeValues(values);
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveMutation.mutate(normalized);
    }, 700);
  }

  async function updateDeflectionCache (updatedDeflection) {
    await queryClient.setQueryData(['deflections', id], updatedDeflection);
    const cachedDeflections = queryClient.getQueryData(['deflections', incident?.id, 'active']);
    if (cachedDeflections) {
      const updatedDeflections = [...cachedDeflections];
      updatedDeflections[updatedDeflections.findIndex(deflection => deflection.id === id)] = updatedDeflection;
      queryClient.setQueryData(['deflections', incident?.id, 'active'], updatedDeflections);
    }
  }

  const autoSaveMutation = useMutation({
    mutationFn: (data) => Api.deflections.update(id, data),
    onSuccess: async (response) => {
      await updateDeflectionCache(response.data);
    },
  });

  const onSubmitMutation = useMutation({
    mutationFn: (data) => Api.deflections.update(id, data),
    onSuccess: async (response) => {
      await updateDeflectionCache(response.data);
      if (isNew) {
        window.sessionStorage.setItem(HOLDS_TOAST_KEY, JSON.stringify({
          title: 'Person details saved',
          variant: 'success',
          body: `Details for ${getSubjectDisplayName(response.data.subject)} have been saved for Hold ${response.data.id}.`,
        }));
      }
      navigate(isNew ? '/holds' : `/holds/${id}`);
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

  let header;
  if (onSubmitMutation.isPending || autoSaveMutation.isPending) {
    header = <Text c='dimmed' size='lg'>Saving...</Text>;
  } else if (onSubmitMutation.isSuccess || autoSaveMutation.isSuccess) {
    header = <Text c='teal.6' size='lg'>Changes saved</Text>;
  } else if (onSubmitMutation.isError || autoSaveMutation.isError) {
    header = <Text c='red.6' size='lg'>Save failed</Text>;
  }

  return (
    <>
      <Head>
        <title>Personal property</title>
      </Head>
      <Header>
        <Group w='100%' justify='space-between'>
          <IconButtonLink icon={IconArrowLeft} to={isNew ? `/holds/${id}/deflection?isNew=true` : `/holds/${id}`} />
          <Group gap='xs'>
            {header}
            {!!header && isNew && <Text c='gray.5' size='lg'>•</Text>}
            {isNew && <Text c='dimmed' size='lg'>3 of 3</Text>}
          </Group>
        </Group>
      </Header>
      <Container>
        <Group gap='xs' mb='xs'>
          <Text size='md'>Incident {incident ? incident.id : ''}</Text>
          <Text c='gray.5' size='md'>•</Text>
          <Text size='md' c='dimmed'>Hold {deflection ? deflection.id : ''}</Text>
        </Group>
        <Title order={2} mb='xs'>Personal property</Title>
        <Text c='dimmed' size='md' mb='xl'>Document any personal property the person is bringing.</Text>
        <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
          <Fieldset disabled={isLoading || onSubmitMutation.isPending} variant='unstyled'>
            <Stack gap='xl'>
              <Input.Wrapper error={!isNew && !form.getValues().property && 'Select one'}>
                <Chip.Group
                  key={form.key('property')}
                  {...form.getInputProps('property')}
                >
                  <Group gap='sm' mb='md'>
                    {['NONE', 'SMALL', 'MEDIUM', 'LARGE'].map(value => (
                      <Chip
                        key={value}
                        value={value}
                        size='lg'
                        wrapperProps={{ 'data-error': !isNew && !form.getValues().property }}
                      >
                        {t(`property.${value}`)}
                      </Chip>
                    ))}
                  </Group>
                </Chip.Group>
                {isLarge && (
                  <Group gap='xs'>
                    <Text size='sm' c='red'>
                      This may exceed {facility?.name} property limits (~10 gallons). Please confirm with {facility?.name} staff.
                    </Text>
                    <Anchor href={`tel:${facility?.phone}`}>Call {facility?.name}</Anchor>
                  </Group>
                )}
              </Input.Wrapper>
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
