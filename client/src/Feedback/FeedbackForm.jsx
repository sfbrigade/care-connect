import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button, Stack, Text, Textarea, TextInput, Alert } from '@mantine/core';
import { StatusCodes } from 'http-status-codes';

import Api from '../Api';

function FeedbackForm ({ onSuccess }) {
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: (data) => Api.feedback.create(data),
    onSuccess: () => {
      setSuccess(true);
      setMessage('');
      setUserEmail('');
      if (onSuccess) {
        onSuccess();
      }
      setTimeout(() => setSuccess(false), 5000);
    },
  });

  function handleSubmit (event) {
    event.preventDefault();
    if (!message.trim()) {
      return;
    }
    mutation.mutate({
      message: message.trim(),
      userEmail: userEmail.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={16}>
        <Text size='xl' fw={700} c='black'>
          Share your feedback
        </Text>

        <Stack gap={4}>
          <Text size='sm' fw={600} c='black'>
            Tell us what you like about the app, or what we could do to improve your experience.
          </Text>
          <Text size='xs' c='#868e96'>
            You can also email us at careconnect@sfgov.org
          </Text>
        </Stack>

        <Textarea
          placeholder=' '
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          minRows={6}
          required
          disabled={mutation.isPending}
          styles={{
            input: {
              borderColor: '#dee2e6',
              borderRadius: '4px',
              padding: '12px',
            },
          }}
        />

        <TextInput
          placeholder='Your email (optional)'
          value={userEmail}
          onChange={(event) => setUserEmail(event.target.value)}
          type='email'
          disabled={mutation.isPending}
          styles={{
            input: {
              borderColor: '#dee2e6',
              borderRadius: '4px',
            },
          }}
        />

        {success && (
          <Alert color='green' title='Thank you!'>
            Your feedback has been submitted successfully.
          </Alert>
        )}

        {mutation.isError && (
          <Alert color='red' title='Error'>
            {mutation.error?._form || 'Failed to submit feedback. Please try again.'}
          </Alert>
        )}

        <Button
          type='submit'
          disabled={!message.trim() || mutation.isPending}
          loading={mutation.isPending}
          styles={{
            root: {
              backgroundColor: '#000000',
              color: '#ffffff',
              borderRadius: '24px',
              padding: '8px 20px',
            },
          }}
        >
          Share feedback
        </Button>
      </Stack>
    </form>
  );
}

export default FeedbackForm;

