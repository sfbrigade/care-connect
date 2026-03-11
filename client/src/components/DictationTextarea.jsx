import { Anchor, Image, Modal, Stack, Text, Textarea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

import { useMobile } from '@/hooks/useMobile';
import { isAndroid, isIOS } from '@/utils/platform';

import iosKeyboardHint from '@/assets/images/ios-keyboard-dictation-hint.webp';

/**
 * Drop-in replacement for Mantine Textarea with keyboard dictation hints.
 *
 * - iOS mobile: hint linking to modal with screenshot of keyboard mic icon
 * - Android mobile: hint linking to modal with Gboard voice typing instructions
 * - Desktop: renders a plain Textarea
 *
 * @param {object} props - All standard Textarea props, plus:
 * @param {object} props.form - Mantine useForm instance (passed through, unused here)
 * @param {string} props.field - Form field name (passed through, unused here)
 */
export default function DictationTextarea ({ form, field, ...textareaProps }) {
  const isMobile = useMobile();

  if (isMobile && isIOS()) {
    return <KeyboardDictationHint platform='ios' {...textareaProps} />;
  }

  if (isMobile && isAndroid()) {
    return <KeyboardDictationHint platform='android' {...textareaProps} />;
  }

  return <Textarea {...textareaProps} />;
}

function KeyboardDictationHint ({ platform, ...textareaProps }) {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Textarea {...textareaProps} />
      <Anchor size='sm' mt={4} onClick={open}>
        Tip: Use your voice to type
      </Anchor>
      <Modal opened={opened} onClose={close} title='Use voice dictation' centered>
        <Stack gap='md'>
          {platform === 'ios' ? (
            <>
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
            </>
          ) : (
            <>
              <Text size='sm'>
                You can use your voice to fill out this field. Tap the microphone icon on your Gboard keyboard to start voice typing.
              </Text>
              <Text size='sm' c='dimmed'>
                If you don&apos;t see the microphone icon, long-press the comma key or check your keyboard settings. Voice typing works best with Gboard (Google Keyboard).
              </Text>
            </>
          )}
        </Stack>
      </Modal>
    </>
  );
}
