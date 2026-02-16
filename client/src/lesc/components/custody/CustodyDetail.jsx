import { useParams } from 'react-router';
import { Head } from '@unhead/react';
import { useQuery } from '@tanstack/react-query';

import Api from '@/Api';
import CustodyDetailContent from './CustodyDetailContent';

function CustodyDetail () {
  const { id } = useParams();
  const savedTab = window.sessionStorage.getItem('custodyTab') || 'in-custody';
  const backTo = savedTab === 'in-custody' ? '/custody' : '/custody?tab=released';

  const { data: deflection } = useQuery({
    queryKey: ['deflections', id],
    queryFn: () => Api.deflections.get(id).then(response => response.data),
  });

  return (
    <>
      <Head>
        <title>Custody Details</title>
      </Head>
      <CustodyDetailContent deflection={deflection} backTo={backTo} />
    </>
  );
}

export default CustodyDetail;
