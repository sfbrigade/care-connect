import { PDFViewer } from '@react-pdf/renderer';
import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Container, Group, Loader, Alert } from '@mantine/core';

import Api from '@/Api';
import CertificateOfReleaseForm from 'care-connect-server/lib/forms/CertificateOfReleaseForm.jsx';

function buildFormData (deflection) {
  const subject = deflection?.subject;
  const subjectName = subject
    ? [subject.firstName, subject.middleInitial, subject.lastName].filter(Boolean).join(' ')
    : '';

  const deputy = deflection?.releasedBy || deflection?.createdBy;
  const deputyTitle = deputy?.title?.name || '';
  const deputyName = deputy ? `${deputy.firstName} ${deputy.lastName}` : '';
  const deputyBadge = deputy?.badgeNumber || '';
  const deputyRankNameStar = [deputyTitle, deputyName, deputyBadge ? `#${deputyBadge}` : '']
    .filter(Boolean)
    .join(' ');

  const unitIdentifier =
    deflection?.incident?.createdByUnit?.name || deputy?.unit?.name || '';

  return {
    subjectName,
    detentionDate: deflection?.createdAt || null,
    releaseDate: deflection?.releasedAt || null,
    deputyRankNameStar,
    unitIdentifier,
  };
}

export default function Form849BDevPreview () {
  const { deflectionId } = useParams();

  const { data: deflection, isLoading, error } = useQuery({
    queryKey: ['deflections', deflectionId],
    queryFn: () => Api.deflections.get(deflectionId).then((r) => r.data),
    enabled: !!deflectionId,
  });

  if (isLoading) {
    return (
      <Container py='xl'>
        <Group justify='center'>
          <Loader />
        </Group>
      </Container>
    );
  }

  if (error) {
    return (
      <Container py='xl'>
        <Alert color='red' title='Error'>
          Could not load deflection #{deflectionId}
        </Alert>
      </Container>
    );
  }

  const data = buildFormData(deflection ?? {});

  return (
    <PDFViewer style={{ width: '100%', height: '100vh', border: 'none' }}>
      <CertificateOfReleaseForm data={data} />
    </PDFViewer>
  );
}
