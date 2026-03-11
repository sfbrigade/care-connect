import { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router';
import { Alert, Button, Container, Fieldset, Group, Stack, TextInput, Title } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from '@/Api';

function AdminDeflectionDetailCategoriesForm () {
    const location = useLocation();
    const params = useParams();
    const navigate = useNavigate();
    const categoryId = params.reasonId;
    const isNew = !categoryId;

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            id: '',
            name: '',
        },
        validate: {
            id: isNotEmpty('ID (Slug) is required.'),
            name: isNotEmpty('Name is required.'),
        },
    });

    const { data: response, isLoading } = useQuery({
        queryKey: ['deflection', 'detailCategories'],
        queryFn: () => Api.deflections.detailCategories.get(categoryId),
        enabled: !!categoryId,
    });

    useEffect(() => {
        if (response) {
            form.initialize(response.data);
        }
    }, [response]);

    const onSubmitMutation = useMutation({
        mutationFn: (values) => {
            if (isNew) {
                return Api.deflections.detailCategories.create(values);
            } else {
                return Api.deflections.detailCategories.update(categoryId, values);
            }
        },
        onMutate: () => setSuccess(false),
        onSuccess: () => {
            setSuccess(true);
            if (isNew) {
                navigate('/admin/enums/deflection-cancel-reasons');
            }
        },
        onError: (errors) => form.setErrors(errors),
        onSettled: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    });

    const deleteMutation = useMutation({
        mutationFn: () => Api.deflections.detailCategories.delete(categoryId),
        onSuccess: () => {
            navigate('/admin/enums/deflection-details-categories');
        },
        onError: (errors) => form.setErrors(errors),
    });

    const [success, setSuccess] = useState(false);

    function handleCancel () {
        navigate(-1);
    }

    function handleDelete () {
        if (window.confirm('Are you sure you want to delete this detail category?')) {
            deleteMutation.mutate();
        }
    }

    return (
        <>
            <Head>
                <title>{isNew ? 'New Deflection Detail Category' : 'Edit Deflection Detail Category'}</title>
            </Head>
            <Container>
                <Title mb='md'>{isNew ? 'New Deflection Detail Category' : 'Edit Deflection Detail Category'}</Title>
                <form onSubmit={form.onSubmit((values) => onSubmitMutation.mutateAsync(values))}>
                    <Fieldset disabled={isLoading} variant='unstyled'>
                        <Stack>
                            {location.state?.flash && <Alert>{location.state?.flash}</Alert>}
                            {form.errors?._form && <Alert color='red'>{form.errors._form}</Alert>}
                            {success && <Alert>Cancel reason has been {isNew ? 'created' : 'updated'}!</Alert>}

                            <TextInput
                                {...form.getInputProps('id')}
                                key={form.key('id')}
                                label='ID (Slug)'
                                placeholder='e.g. possible_drug_use'
                                disabled={!isNew}
                            />

                            <TextInput
                                {...form.getInputProps('name')}
                                key={form.key('name')}
                                label='Name'
                                placeholder='e.g. Possible Drug Use'
                            />

                            <Group>
                                <Button disabled={onSubmitMutation.isPending} type='submit'>Submit</Button>
                                <Button
                                    variant='light'
                                    onClick={handleCancel}
                                    disabled={onSubmitMutation.isPending}
                                >
                                    Cancel
                                </Button>
                                {!isNew && (
                                    <Button
                                        color='red'
                                        variant='light'
                                        onClick={handleDelete}
                                        disabled={deleteMutation.isPending || onSubmitMutation.isPending}
                                    >
                                        Delete
                                    </Button>
                                )}
                            </Group>
                        </Stack>
                    </Fieldset>
                </form>
            </Container>
        </>
    );
}

export default AdminDeflectionDetailCategoriesForm;
