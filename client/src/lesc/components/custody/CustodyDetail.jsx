import { useParams } from 'react-router';
import { Head } from '@unhead/react';
import { useQuery } from '@tanstack/react-query';

import Api from '@/Api';
import CustodyDetailContent from './CustodyDetailContent';

function CustodyDetail ({ viewerMode = 'custody' }) {
  const { id } = useParams();
  const isCareView = viewerMode === 'care';
  const savedTab = window.sessionStorage.getItem(isCareView ? 'careTab' : 'custodyTab') || 'in-custody';
  const backTo = isCareView
    ? (savedTab === 'not-in-custody' ? '/care?tab=not-in-custody' : '/care')
    : (savedTab === 'in-custody' ? '/custody' : '/custody?tab=released');

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
