import { useEffect, useState } from 'react';
import { Button, Group, Input, Modal, Radio, Stack, Text, Textarea, UnstyledButton } from '@mantine/core';
import { IconMoodSad, IconMoodSmile, IconMoodEmpty } from '@tabler/icons-react';

export const SATISFACTION_SURVEY_FLAG_KEY = 'satisfactionSurveyEnabled';
export const SATISFACTION_SURVEY_RESPONSES_KEY = 'satisfactionSurveyResponses';

const INITIAL_ANSWERS = {
  overallSatisfaction: '',
  feltHeard: '',
  additionalFeedback: '',
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

export function appendSatisfactionSurveyResponse (deflectionId, didCompleteSurvey, answers, { source = 'legal_release' } = {}) {
  const previousResponses = JSON.parse(window.sessionStorage.getItem(SATISFACTION_SURVEY_RESPONSES_KEY) || '[]');
  window.sessionStorage.setItem(
    SATISFACTION_SURVEY_RESPONSES_KEY,
    JSON.stringify([
      ...previousResponses,
      {
        deflectionId: String(deflectionId),
        source,
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
  source = 'legal_release',
  careConnectionQuestionLabel = 'How&apos;s your CareConnect app experience?',
  resetQuestionLabel = 'How can we improve operations at the RESET facility?',
}) {
  const [surveyStep, setSurveyStep] = useState(0);
  const [surveyAnswers, setSurveyAnswers] = useState(INITIAL_ANSWERS);

  useEffect(() => {
    if (!opened) return;
    setSurveyStep(0);
    setSurveyAnswers(INITIAL_ANSWERS);
  }, [opened]);

  const finish = (didCompleteSurvey) => {
    if (didCompleteSurvey) {
      // TODO: Trigger the survey API call here
    }
    onFinished();
  };

  return (
    <Modal
      opened={opened}
      onClose={() => finish(false)}
      title='Quick satisfaction survey'
      centered
      withCloseButton={false}
    >
      <Stack gap='md'>
        <Text size='sm' c='dimmed'>Question {surveyStep + 1} of 3</Text>
        {surveyStep === 0 && (
          <Input.Wrapper label={careConnectionQuestionLabel}>
            <Group mt='xs' justify='center'>
              {SATISFACTION_OPTIONS.map((option) => {
                const isSelected = surveyAnswers.overallSatisfaction === option.value;

                return (
                  <UnstyledButton
                    key={option.value}
                    onClick={() => setSurveyAnswers((prev) => ({ ...prev, overallSatisfaction: option.value }))}
                    aria-label={option.label}
                    style={{
                      border: isSelected ? '2px solid #228be6' : '2px solid transparent',
                      borderRadius: '12px',
                      backgroundColor: isSelected ? '#e7f5ff' : 'transparent',
                      padding: '8px 12px',
                    }}
                  >
                    <Stack gap={4} align='center'>
                      <option.Icon size={32} stroke={1.8} color={isSelected ? '#228be6' : '#868e96'} />
                      <Text size='sm' c={isSelected ? 'blue.7' : 'dimmed'}>{option.label}</Text>
                    </Stack>
                  </UnstyledButton>
                );
              })}
            </Group>
          </Input.Wrapper>
        )}
        {surveyStep === 1 && (
          <Input.Wrapper label={resetQuestionLabel}>
            <Radio.Group
              value={surveyAnswers.feltHeard}
              onChange={(value) => setSurveyAnswers((prev) => ({ ...prev, feltHeard: value }))}
            >
              <Stack gap='xs' mt='xs'>
                <Radio value='yes' label='Yes' />
                <Radio value='somewhat' label='Somewhat' />
                <Radio value='no' label='No' />
              </Stack>
            </Radio.Group>
          </Input.Wrapper>
        )}
        {surveyStep === 2 && (
          <Textarea
            label='Any additional feedback? (optional)'
            value={surveyAnswers.additionalFeedback}
            onChange={(event) => setSurveyAnswers((prev) => ({ ...prev, additionalFeedback: event.currentTarget.value }))}
            minRows={3}
          />
        )}
        <Group justify='space-between' mt='sm'>
          <Button
            variant='secondary'
            onClick={() => finish(false)}
          >
            Skip
          </Button>
          <Group>
            <Button
              variant='secondary'
              onClick={() => setSurveyStep((prev) => Math.max(prev - 1, 0))}
              disabled={surveyStep === 0}
            >
              Back
            </Button>
            {surveyStep < 2 && (
              <Button
                onClick={() => setSurveyStep((prev) => prev + 1)}
                disabled={
                  (surveyStep === 0 && !surveyAnswers.overallSatisfaction) ||
                  (surveyStep === 1 && !surveyAnswers.feltHeard)
                }
              >
                Next
              </Button>
            )}
            {surveyStep === 2 && (
              <Button
                onClick={() => finish(true)}
              >
                Submit
              </Button>
            )}
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}

export default SatisfactionSurveyModal;
