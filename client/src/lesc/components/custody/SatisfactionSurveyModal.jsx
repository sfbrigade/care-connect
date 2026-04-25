import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Box, Button, Group, Input, Modal, Stack, Text, Textarea, UnstyledButton } from '@mantine/core';
import { IconMoodSad, IconMoodSmile, IconMoodEmpty, IconX } from '@tabler/icons-react';

import Api from '@/Api';
import { useToast } from '@/components/ToastContext';

export const SATISFACTION_SURVEY_FLAG_KEY = 'satisfactionSurveyEnabled';
export const SATISFACTION_SURVEY_RESPONSES_KEY = 'satisfactionSurveyResponses';

const INITIAL_ANSWERS = {
  careConnectRating: '',
  improvementSuggestions: '',
  resetFacilityFeedback: '',
};

const SATISFACTION_OPTIONS = [
  { value: 'bad', label: 'Bad', Icon: IconMoodSad },
  { value: 'neutral', label: 'Neutral', Icon: IconMoodEmpty },
  { value: 'good', label: 'Good', Icon: IconMoodSmile },
];

export function isSatisfactionSurveyEnabled () {
  // return typeof window !== 'undefined' && window.sessionStorage.getItem(SATISFACTION_SURVEY_FLAG_KEY) === 'true';
  return true;
}

export function appendSatisfactionSurveyResponse (deflectionId, didCompleteSurvey, answers, { department } = {}) {
  const previousResponses = JSON.parse(window.sessionStorage.getItem(SATISFACTION_SURVEY_RESPONSES_KEY) || '[]');
  window.sessionStorage.setItem(
    SATISFACTION_SURVEY_RESPONSES_KEY,
    JSON.stringify([
      ...previousResponses,
      {
        deflectionId: String(deflectionId),
        department,
        didCompleteSurvey,
        answers,
        createdAt: new Date().toISOString(),
      },
    ])
  );
}

function SatisfactionSurveyModal ({
  opened,
  deflectionId,
  onFinished,
  department,
}) {
  const { showToast } = useToast();
  const [surveyStep, setSurveyStep] = useState(0);
  const [showImprovementSuggestions, setShowImprovementSuggestions] = useState(false);
  const [surveyAnswers, setSurveyAnswers] = useState(INITIAL_ANSWERS);
  const [submitting, setSubmitting] = useState(false);
  const advanceStepTimerRef = useRef(null);

  const clearAdvanceStepTimer = () => {
    if (advanceStepTimerRef.current != null) {
      clearTimeout(advanceStepTimerRef.current);
      advanceStepTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!opened) return;
    setShowImprovementSuggestions(false);
    setSurveyStep(0);
    setSurveyAnswers(INITIAL_ANSWERS);
    setSubmitting(false);
    return () => clearAdvanceStepTimer();
  }, [opened]);

  const finish = async (didCompleteSurvey) => {
    if (didCompleteSurvey && deflectionId != null) {
      const improvementTrimmed = surveyAnswers.improvementSuggestions.trim();
      try {
        setSubmitting(true);
        await Api.deflections.submitSatisfactionSurvey(deflectionId, {
          department,
          answers: {
            careConnectRating: surveyAnswers.careConnectRating,
            resetFacilityFeedback: surveyAnswers.resetFacilityFeedback.trim(),
            ...(improvementTrimmed ? { improvementSuggestions: improvementTrimmed } : {}),
          },
        });
        showToast('Thank you. Your feedback helps us improve your experience.', 'success');
      } catch (err) {
        console.error(err);
        showToast('Feedback could not be saved. You can try again later.', 'error');
      } finally {
        setSubmitting(false);
      }
    }
    onFinished();
  };

  return (
    <Modal
      opened={opened}
      onClose={() => finish(false)}
      title={null}
      centered
      withCloseButton={false}
    >
      <Stack gap='md'>
        <Group justify='space-between' align='center' wrap='nowrap'>
          <Text size='sm' c='dimmed'>{surveyStep + 1} of 2</Text>
          <ActionIcon
            type='button'
            onClick={() => finish(false)}
            variant='transparent'
            flex='none'
            aria-label='Close survey'
            styles={{
              root: {
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: '#f1f3f5',
                '&:hover': {
                  backgroundColor: '#e9ecef',
                },
              },
            }}
          >
            <IconX size={20} stroke={2.25} color='#868e96' />
          </ActionIcon>
        </Group>
        {surveyStep === 0 && (
          <Input.Wrapper size='xl' label='How&apos;s your CareConnect app experience?'>
            <Group mt='lg' grow gap='xs'>
              {SATISFACTION_OPTIONS.map((option) => {
                const isSelected = surveyAnswers.careConnectRating === option.value;

                return (
                  <UnstyledButton
                    key={option.value}
                    onClick={() => {
                      clearAdvanceStepTimer();
                      setSurveyAnswers((prev) => ({ ...prev, careConnectRating: option.value }));
                      if (option.value === 'bad') {
                        setShowImprovementSuggestions(true);
                        return;
                      }
                      if (option.value === 'neutral' || option.value === 'good') {
                        setShowImprovementSuggestions(false);
                        advanceStepTimerRef.current = setTimeout(() => {
                          advanceStepTimerRef.current = null;
                          setSurveyStep(1);
                        }, 1000);
                      }
                    }}
                    aria-label={option.label}
                    style={{ display: 'flex', justifyContent: 'center', width: '100%' }}
                  >
                    <Stack gap={10} align='center'>
                      <Box
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 54,
                          height: 54,
                          borderRadius: '50%',
                          backgroundColor: isSelected ? '#e7f5ff' : '#f1f3f5',
                        }}
                      >
                        <option.Icon size={32} stroke={1.8} color={isSelected ? '#228be6' : '#868e96'} />
                      </Box>
                      <Text size='sm' c={isSelected ? 'blue.7' : 'dimmed'}>{option.label}</Text>
                    </Stack>
                  </UnstyledButton>
                );
              })}
            </Group>
          </Input.Wrapper>
        )}
        {surveyStep === 0 && showImprovementSuggestions && (
          <Input.Wrapper size='md' mt='xl' label='What can we do to improve your experience with CareConnect?'>
            <Group mt='sm' grow gap='xs'>
              <Textarea
                placeholder='Share your thoughts...'
                value={surveyAnswers.improvementSuggestions}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setSurveyAnswers((prev) => ({ ...prev, improvementSuggestions: value }));
                }}
              />
            </Group>
          </Input.Wrapper>
        )}
        {surveyStep === 1 && (
          <Input.Wrapper size='xl' label='How can we improve operations at the RESET facility?'>
            <Textarea
              placeholder='Share your thoughts...'
              mt='lg'
              value={surveyAnswers.resetFacilityFeedback}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setSurveyAnswers((prev) => ({ ...prev, resetFacilityFeedback: value }));
              }}
              minRows={3}
              styles={{
                input: {
                  '&::placeholder': {
                    fontSize: 'var(--mantine-font-size-xs)',
                    color: 'var(--mantine-color-dimmed)',
                  },
                },
              }}
            />
          </Input.Wrapper>
        )}
        <Group justify='flex-start' mt='sm'>
          {surveyStep < 1 &&
            !(surveyStep === 0 && (surveyAnswers.careConnectRating === 'neutral' || surveyAnswers.careConnectRating === 'good')) && (
              <Button
                onClick={() => setSurveyStep((prev) => prev + 1)}
                disabled={
                  (surveyStep === 0 && !surveyAnswers.careConnectRating) ||
                  (surveyStep === 1 && !surveyAnswers.resetFacilityFeedback)
                }
              >
                Next
              </Button>
          )}
          {surveyStep === 1 && (
            <Button
              loading={submitting}
              onClick={async () => {
                await finish(true);
              }}
            >
              Share feedback
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}

export default SatisfactionSurveyModal;
