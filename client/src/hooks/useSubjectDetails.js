import { useTranslation } from 'react-i18next';
import { calculateAge } from '@/utils/format';

export default function useSubjectDetails (subject) {
  const { t } = useTranslation();
  const details = [];
  if (subject?.dateOfBirth) details.push(`${calculateAge(subject.dateOfBirth)} y.o.`);
  if (subject?.sex) details.push(t(`sex.${subject.sex}`));
  return details;
}
