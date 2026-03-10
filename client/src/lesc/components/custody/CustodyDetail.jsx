import { useParams } from 'react-router';
import { Head } from '@unhead/react';
import { useQuery } from '@tanstack/react-query';

import Api from '@/Api';
import CustodyDetailContent from './CustodyDetailContent';

function CustodyDetail ({ viewerMode = 'custody' }) {
  const { id } = useParams();
  const isCareView = viewerMode === 'care';
  const backTo = isCareView ? '/care' : '/custody';

  const { data: deflection } = useQuery({
    queryKey: ['deflections', id],
    queryFn: () => Api.deflections.get(id).then(response => response.data),
  });

  return (
    <>
      <Head>
        <title>{isCareView ? 'Care Details' : 'Custody Details'}</title>
      </Head>
      <CustodyDetailContent deflection={deflection} backTo={backTo} viewerMode={viewerMode} />
    </>
  );
}

export default CustodyDetail;
