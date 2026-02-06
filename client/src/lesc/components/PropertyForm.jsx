import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Head } from '@unhead/react';
import { IconArrowLeft } from '@tabler/icons-react';
import { Anchor, Button, Chip, Container, Fieldset, Group, Stack, Text, Textarea, Title } from '@mantine/core';
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
  const isNewQuery = searchParams.get('isNew') === 'true';
  const [isNewFlow, setIsNewFlow] = useState(() => {
    if (isNewQuery) {
      return true;
    }
    if (typeof window === 'undefined') {
      return false;
    }
    return window.localStorage.getItem(`deflection-new-flow-${id}`) === 'true';
  });
  const isNew = isNewQuery;
  const queryClient = useQueryClient();
  const { facility } = useFacilityContext();
  const [isInitialized, setInitialized] = useState(false);
  const { t } = useTranslation();
  const [isLarge, setIsLarge] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle');
  const autoSaveTimerRef = useRef(null);
  const lastSavedValuesRef = useRef(initialValues);

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
      if (!isInitialized) {
        return;
      }
      setIsLarge(values.property === 'LARGE');
      scheduleAutoSave(values);
    },
  });

  useEffect(() => {
    if (!isLoading && !isInitialized) {
      if (deflection) {
        const normalized = normalizeValues({
          property: deflection.property,
          propertyDetails: deflection.propertyDetails,
        });
        lastSavedValuesRef.current = normalized;
        form.setInitialValues(normalized);
        form.reset();
      }
      setInitialized(true);
      setAutoSaveStatus('saved');
    }
  }, [isLoading, isInitialized, deflection]);

  useEffect(() => {
    if (isNew) {
      setIsNewFlow(true);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`deflection-new-flow-${id}`, 'true');
      }
    }
  }, [isNew]);

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

  function valuesMatch (a, b) {
    return a.property === b.property && a.propertyDetails === b.propertyDetails;
  }

  function scheduleAutoSave (values) {
    const normalized = normalizeValues(values);
    if (valuesMatch(normalized, lastSavedValuesRef.current)) {
      return;
    }
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
    onMutate: () => {
      setAutoSaveStatus('saving');
    },
    onSuccess: async (response, variables) => {
      await updateDeflectionCache(response.data);
      lastSavedValuesRef.current = normalizeValues(variables);
      setAutoSaveStatus('saved');
    },
    onError: () => {
      setAutoSaveStatus('error');
    },
  });

  const onSubmitMutation = useMutation({
    mutationFn: (data) => Api.deflections.update(id, data),
    onSuccess: async (response) => {
      await updateDeflectionCache(response.data);
      if (isNewFlow && typeof window !== 'undefined') {
        window.localStorage.removeItem(`deflection-new-flow-${id}`);
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

  const headerStatus = (() => {
    if (onSubmitMutation.isPending || autoSaveStatus === 'saving') {
      return { text: 'Saving...', color: 'dimmed' };
    }
    if (autoSaveStatus === 'error') {
      return { text: 'Save failed', color: 'red.6' };
    }
    if (autoSaveStatus === 'saved' || onSubmitMutation.isSuccess) {
      return { text: 'Changes saved', color: 'teal.6' };
    }
    return null;
  })();

  return (
    <>
      <Head>
        <title>Personal property</title>
      </Head>
      <Header>
        <Group w='100%' justify='space-between'>
          <IconButtonLink icon={IconArrowLeft} to={isNew ? `/holds/${id}/deflection?isNew=true` : `/holds/${id}`} />
          <Group gap='xs'>
            {headerStatus && <Text c={headerStatus.color} size='lg'>{headerStatus.text}</Text>}
            {headerStatus && isNewFlow && <Text c='gray.5' size='lg'>•</Text>}
            {isNewFlow && <Text c='dimmed' size='lg'>3 of 3</Text>}
          </Group>
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
              {isLarge && (
                <Group gap='xs'>
                  <Text size='sm' c='red'>
                    This may exceed {facility?.name} property limits (~10 gallons). Please confirm with {facility?.name} staff.
                  </Text>
                  <Anchor href={`tel:${facility?.phone}`}>Call {facility?.name}</Anchor>
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
