import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { Head } from '@unhead/react';
import { IconArrowLeft, IconX } from '@tabler/icons-react';
import { Accordion, Anchor, Badge, Box, Button, CloseButton, Container, Divider, Fieldset, Group, Image, Stack, Text, Textarea, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useFacilityContext } from '@/FacilityContext';
import Api from '@/Api';
import ChipInput from '@/components/ChipInput';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import PhotoInput from '@/components/PhotoInput';
import { useToast } from '@/components/ToastContext';
import { validateProperty } from '@/utils/validators';

const initialValues = {
  property: '',
  propertyDetails: '',
};
const maxPropertyPhotos = 5;

function PropertyForm () {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get('isNew') === 'true';
  const isCustodyContext = location.pathname.startsWith('/custody');
  const queryClient = useQueryClient();
  const { facility } = useFacilityContext();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [isLarge, setIsLarge] = useState(false);
  const autoSaveTimerRef = useRef(null);

  const { data: deflection, isLoading } = useQuery({
    queryKey: ['deflections', id],
    queryFn: () => Api.deflections.get(id).then(response => response.data),
  });

  const form = useForm({
    mode: 'uncontrolled',
    initialValues,
    onValuesChange: (values) => {
      setIsLarge(values.property === 'LARGE');
      if (form.initialized && !isCustodyContext) {
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
    queryClient.invalidateQueries({ queryKey: ['facilities', facility.id, 'my-holds'] });
    if (isCustodyContext) {
      queryClient.invalidateQueries({ queryKey: ['deflections', String(id)] });
      queryClient.invalidateQueries({ queryKey: ['deflections', facility.id] });
      queryClient.invalidateQueries({ queryKey: ['deflections'] });
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
      if (isCustodyContext) {
        showToast('Property details saved', 'success', 4000, 'Property details have been saved.');
        navigate(`/custody/${id}`);
        return;
      }
      navigate(isNew ? `/holds/${id}/certify?isNew=true` : `/holds/${id}`);
    },
    onError: () => {
      if (!isCustodyContext) return;
      showToast('We couldn’t save property details', 'error', 4000, 'Please try again.');
      navigate(`/custody/${id}`);
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
  if (onSubmitMutation.isPending || (!isCustodyContext && autoSaveMutation.isPending)) {
    header = <Text c='dimmed' size='lg'>Saving...</Text>;
  } else if (!isCustodyContext && (onSubmitMutation.isSuccess || autoSaveMutation.isSuccess)) {
    header = <Text c='teal.6' size='lg'>Changes saved</Text>;
  } else if (!isCustodyContext && (onSubmitMutation.isError || autoSaveMutation.isError)) {
    header = <Text c='red.6' size='lg'>Save failed</Text>;
  }

  const detailPath = isCustodyContext ? `/custody/${id}` : `/holds/${id}`;
  const backPath = isCustodyContext ? detailPath : (isNew ? `/holds/${id}/deflection?isNew=true` : detailPath);
  const closePath = isCustodyContext ? detailPath : '/holds';
  const headerJustify = isCustodyContext ? 'flex-end' : 'space-between';

  return (
    <>
      <Head>
        <title>Personal property</title>
      </Head>
      <Header>
        <Group w='100%' justify={headerJustify}>
          {!isCustodyContext && <IconButtonLink icon={IconArrowLeft} to={backPath} aria-label='Go back' />}
          {header}
          <IconButtonLink icon={IconX} to={closePath} aria-label='Close' />
        </Group>
      </Header>
      <Container>
        <Group gap='xs' mb='xs'>
          <Text size='md'>Incident {deflection ? deflection.incidentId : ''}</Text>
          <Text c='gray.5' size='md'>•</Text>
          <Text size='md' c='dimmed'>Hold {deflection ? deflection.id : ''}</Text>
        </Group>
        <Group gap='sm' mb='xs' align='center'>
          <Title order={2}>Personal property</Title>
          {isNew && <Badge variant='light' color='gray' size='lg' radius='xl'>4/5</Badge>}
        </Group>
        <Text c='dimmed' size='md' mb='xl'>
          {isCustodyContext ? 'Record the amount of personal property.' : 'Document any personal property the person is bringing.'}
        </Text>
        <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
          <Fieldset disabled={isLoading || onSubmitMutation.isPending} variant='unstyled'>
            <Stack gap='xl'>
              <ChipInput
                {...form.getInputProps('property')}
                key={form.key('property')}
                label={<>{isCustodyContext ? 'How much personal property does the person have?' : 'How much property is the person bringing?'}<span>*</span></>}
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
              <Divider />
              <Accordion variant='section' defaultValue={[]}>
                <Accordion.Item value='optional'>
                  <Accordion.Control>
                    <Title order={3}>Optional details</Title>
                    <Text c='gray.5' size='sm'>Photo and description</Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap='xl'>
                      <PhotoInput
                        key={`property-photo-uploader-${propertyPhotos.length}`}
                        label='Would you like to add a photo?'
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
                        label='Description'
                        placeholder='e.g., black backpack with clothing and toiletries.'
                      />
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
              <Button type='submit' mb='xl'>
                {isNew ? 'Next: Certify' : (isCustodyContext ? 'Save changes' : 'Save property')}
              </Button>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default PropertyForm;
