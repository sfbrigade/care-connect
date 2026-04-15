import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Head } from '@unhead/react';
import { IconArrowLeft } from '@tabler/icons-react';
import { Anchor, Box, Button, CloseButton, Container, Fieldset, Group, Image, Stack, Text, Textarea, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useFacilityContext } from '@/FacilityContext';
import Api from '@/Api';
import ChipInput from '@/components/ChipInput';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import PhotoInput from '@/components/PhotoInput';
import { validateProperty } from '@/utils/validators';

const initialValues = {
  property: '',
  propertyDetails: '',
};
const maxPropertyPhotos = 5;

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
        if (!isNew) {
          form.setErrors(validateProperty(normalized));
        }
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
      const updatedDeflections = cachedDeflections.map(deflection => (
        deflection.id === id ? updatedDeflection : deflection
      ));
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
      navigate(isNew ? '/holds' : `/holds/${id}`);
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: (file) => Api.propertyPhotos.create({ deflectionId: id, file }),
    onSuccess: async (response) => {
      const cachedDeflection = queryClient.getQueryData(['deflections', id]);
      if (cachedDeflection) {
        const updatedDeflection = {
          ...cachedDeflection,
          propertyPhotos: [...(cachedDeflection.propertyPhotos ?? []), response.data],
        };
        await updateDeflectionCache(updatedDeflection);
      }
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (propertyPhotoId) => Api.propertyPhotos.delete(propertyPhotoId),
    onSuccess: async (_response, propertyPhotoId) => {
      const cachedDeflection = queryClient.getQueryData(['deflections', id]);
      if (cachedDeflection) {
        const updatedDeflection = {
          ...cachedDeflection,
          propertyPhotos: (cachedDeflection.propertyPhotos ?? []).filter(propertyPhoto => propertyPhoto.id !== propertyPhotoId),
        };
        await updateDeflectionCache(updatedDeflection);
      }
    },
  });

  function onAllUploaded (files) {
    const photoCount = deflection?.propertyPhotos?.length ?? 0;
    if (photoCount >= maxPropertyPhotos) {
      return;
    }
    for (const file of files) {
      uploadPhotoMutation.mutate(file);
    }
  }

  function onRemovePhoto (photoId) {
    deletePhotoMutation.mutate(photoId);
  }

  const propertyPhotos = deflection?.propertyPhotos ?? [];

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
          <IconButtonLink icon={IconArrowLeft} to={isNew ? `/holds/${id}/deflection?isNew=true` : `/holds/${id}`} aria-label='Go back' />
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
              <ChipInput
                {...form.getInputProps('property')}
                key={form.key('property')}
                label={<>How much property is the person bringing?<span>*</span></>}
                options={['NONE', 'SMALL', 'MEDIUM', 'LARGE'].map(value => ({
                  value,
                  label: t(`property.${value}`),
                }))}
              />
              {isLarge && (
                <Group gap='xs'>
                  <Text size='sm' c='red'>
                    This may exceed {facility?.name} property limits (~10 gallons). Please confirm with {facility?.name} staff.
                  </Text>
                  <Anchor href={`tel:${facility?.phone}`}>Call {facility?.name}</Anchor>
                </Group>
              )}
              <PhotoInput
                key={`property-photo-uploader-${propertyPhotos.length}`}
                label='Photos (optional)'
                id='file'
                onAllUploaded={onAllUploaded}
                maxPhotos={maxPropertyPhotos}
                photoCount={propertyPhotos.length}
              >
                <Button variant='secondary' size='md' mt='md' loading={uploadPhotoMutation.isPending}>Take or upload photo</Button>
              </PhotoInput>
              {!!propertyPhotos.length && (
                <Group gap='md' align='flex-start'>
                  {propertyPhotos.map((photo, index) => (
                    <Stack key={photo.id} gap='xs'>
                      <Box pos='relative' w={180} h={180}>
                        <Image src={photo.fileUrl} alt={`Property photo ${index + 1}`} h={180} w={180} radius='md' />
                        <CloseButton
                          aria-label={`Remove property photo ${index + 1}`}
                          variant='filled'
                          size='md'
                          pos='absolute'
                          top={8}
                          right={8}
                          bg='gray.0'
                          c='red.7'
                          style={{ zIndex: 1 }}
                          onClick={() => onRemovePhoto(photo.id)}
                          disabled={deletePhotoMutation.isPending}
                        />
                      </Box>
                    </Stack>
                  ))}
                </Group>
              )}
              <Text size='sm' c='dimmed'>
                {propertyPhotos.length} photos uploaded (max. {maxPropertyPhotos} photos)
              </Text>
              <Textarea
                key={form.key('propertyDetails')}
                {...form.getInputProps('propertyDetails')}
                label='Description (optional)'
                placeholder='e.g., black backpack with clothing and toiletries.'
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
