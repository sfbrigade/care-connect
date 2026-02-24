import { useCallback } from 'react';
import { ActionIcon, Anchor, Box, Image, Modal, Stack, Text, Textarea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconMicrophone, IconPlayerStop } from '@tabler/icons-react';

import { useToast } from '@/components/ToastContext';
import { useMobile } from '@/hooks/useMobile';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { isAndroid, isIOS } from '@/utils/platform';

import iosKeyboardHint from '@/assets/images/ios-keyboard-dictation-hint.png';

const micButtonStyle = {
  position: 'absolute',
  right: 8,
  bottom: 8,
  zIndex: 1,
};

// Reserve space so text doesn't flow under the mic button
const textareaInputStyle = {
  paddingRight: '3rem',
};

/**
 * Drop-in replacement for Mantine Textarea with dictation support.
 *
 * - Android mobile: mic button starts/stops Web Speech API dictation
 * - iOS mobile: no mic button, but we show hint text that can be tapped for a help modal
 * - Desktop / unsupported: renders a plain Textarea
 *
 * @param {object} props - All standard Textarea props, plus:
 * @param {object} props.form - Mantine useForm instance
 * @param {string} props.field - Form field name (used with form.setFieldValue)
 */
export default function DictationTextarea ({ form, field, ...textareaProps }) {
  const isMobile = useMobile();

  const showAndroidDictation = isMobile && isAndroid();
  const showIOSHint = isMobile && isIOS();

  if (showAndroidDictation) {
    return <AndroidDictation form={form} field={field} {...textareaProps} />;
  }

  if (showIOSHint) {
    return <IOSDictation {...textareaProps} />;
  }

  return <Textarea {...textareaProps} />;
}

function AndroidDictation ({ form, field, ...textareaProps }) {
  const { showToast } = useToast();

  const appendTranscript = useCallback((transcript) => {
    const current = form.getValues()[field] || '';
    const separator = current && !current.endsWith(' ') ? ' ' : '';
    form.setFieldValue(field, current + separator + transcript);
  }, [form, field]);

  const handleError = useCallback((message) => {
    showToast(message, 'error');
  }, [showToast]);

  const { isListening, isSupported, start, stop } = useSpeechRecognition({
    onResult: appendTranscript,
    onError: handleError,
  });

  if (!isSupported) {
    return <Textarea {...textareaProps} />;
  }

  return (
    <Box pos='relative'>
      <Textarea
        {...textareaProps}
        styles={{ input: textareaInputStyle }}
      />
      <ActionIcon
        variant={isListening ? 'filled' : 'subtle'}
        color={isListening ? 'red' : 'gray'}
        onClick={isListening ? stop : start}
        aria-label={isListening ? 'Stop dictation' : 'Start dictation'}
        size='lg'
        style={micButtonStyle}
      >
        {isListening ? <IconPlayerStop size={20} /> : <IconMicrophone size={20} />}
      </ActionIcon>
    </Box>
  );
}

function IOSDictation ({ ...textareaProps }) {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Textarea {...textareaProps} />
      <Anchor size='sm' mt={4} onClick={open}>
        Tip: Use your voice to type
      </Anchor>
      <Modal opened={opened} onClose={close} title='Use voice dictation' centered>
        <Stack gap='md'>
          <Text size='sm'>
            You can use your voice to fill out this field on your iOS device. To start, tap the microphone icon on your keyboard.
          </Text>
          <Image
            src={iosKeyboardHint}
            alt='iOS keyboard with microphone icon highlighted'
            maw={300}
            radius='md'
            mx='auto'
          />
          <Text size='sm' c='dimmed'>
            If you don&apos;t see the microphone icon, check Settings &gt; General &gt; Keyboard and make sure that &quot;Enable Dictation&quot; is turned on.
          </Text>
        </Stack>
      </Modal>
    </>
  );
}
