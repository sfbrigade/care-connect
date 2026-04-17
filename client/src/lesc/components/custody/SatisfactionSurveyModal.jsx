import { useEffect, useState } from 'react';
import { Button, Group, Input, Modal, Radio, Stack, Text, Textarea } from '@mantine/core';

export const SATISFACTION_SURVEY_FLAG_KEY = 'satisfactionSurveyEnabled';
export const SATISFACTION_SURVEY_RESPONSES_KEY = 'satisfactionSurveyResponses';

const INITIAL_ANSWERS = {
  overallSatisfaction: '',
  feltHeard: '',
  additionalFeedback: '',
};

export function isSatisfactionSurveyEnabled () {
  return typeof window !== 'undefined' && window.sessionStorage.getItem(SATISFACTION_SURVEY_FLAG_KEY) === 'true';
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
  satisfactionQuestionLabel = 'How satisfied are you with the legal release process?',
  heardQuestionLabel = 'Did you feel heard and supported during this process?',
}) {
  const [surveyStep, setSurveyStep] = useState(0);
  const [surveyAnswers, setSurveyAnswers] = useState(INITIAL_ANSWERS);

  useEffect(() => {
    if (!opened) return;
    setSurveyStep(0);
    setSurveyAnswers(INITIAL_ANSWERS);
  }, [opened]);

  const finish = (didCompleteSurvey) => {
    appendSatisfactionSurveyResponse(deflectionId, didCompleteSurvey, surveyAnswers, { source });
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
          <Input.Wrapper label={satisfactionQuestionLabel}>
            <Radio.Group
              value={surveyAnswers.overallSatisfaction}
              onChange={(value) => setSurveyAnswers((prev) => ({ ...prev, overallSatisfaction: value }))}
            >
              <Stack gap='xs' mt='xs'>
                <Radio value='very_satisfied' label='Very satisfied' />
                <Radio value='satisfied' label='Satisfied' />
                <Radio value='neutral' label='Neutral' />
                <Radio value='dissatisfied' label='Dissatisfied' />
                <Radio value='very_dissatisfied' label='Very dissatisfied' />
              </Stack>
            </Radio.Group>
          </Input.Wrapper>
        )}
        {surveyStep === 1 && (
          <Input.Wrapper label={heardQuestionLabel}>
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
