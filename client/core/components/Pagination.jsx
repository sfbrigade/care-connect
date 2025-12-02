import { Group, Pagination as MPagination } from '@mantine/core';
import { Link } from 'react-router';

function Pagination ({ page, lastPage, otherParams = {} }) {
  function onChange () {
    window.scrollTo(0, 0);
  }
  return (
    <MPagination.Root
      onChange={onChange}
      total={lastPage}
      getItemProps={(page) => ({
        component: Link,
        to: `?${new URLSearchParams({ ...otherParams, page })}`,
      })}
    >
      <Group gap={7} mt='xl'>
        <MPagination.First component={Link} to={`?${new URLSearchParams({ ...otherParams, page: 1 })}`} />
        <MPagination.Previous component={Link} to={`?${new URLSearchParams({ ...otherParams, page: Math.max(1, page - 1) })}`} />
        <MPagination.Items />
        <MPagination.Next component={Link} to={`?${new URLSearchParams({ ...otherParams, page: Math.min(lastPage, page + 1) })}`} />
        <MPagination.Last component={Link} to={`?${new URLSearchParams({ ...otherParams, page: lastPage })}`} />
      </Group>
    </MPagination.Root>
  );
}

export default Pagination;
