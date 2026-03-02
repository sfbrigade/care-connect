import { forwardRef, useEffect, useRef, useState } from 'react';
import { Autocomplete, Loader } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';

import Api from '@/Api';

const AddressAutocomplete = forwardRef(function AddressAutocomplete ({ form, field, rightSection, ...props }, ref) {
  const [value, setValue] = useState(form.getValues()[field] ?? '');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const resultsRef = useRef([]);
  const abortControllerRef = useRef(null);
  const [debounced] = useDebouncedValue(value, 300);

  useEffect(() => {
    if (!debounced || debounced.length < 3) {
      setData([]);
      resultsRef.current = [];
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    Api.geocode.autocomplete(debounced, { signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;
        const results = response?.data ?? [];
        resultsRef.current = results;
        const seen = new Set();
        setData(results
          .filter((r) => r.addressLine1)
          .filter((r) => {
            if (seen.has(r.addressLine1)) return false;
            seen.add(r.addressLine1);
            return true;
          })
          .map((r) => ({
            value: r.addressLine1,
            label: r.neighborhood
              ? `${r.addressLine1} (${r.neighborhood})`
              : r.addressLine1,
          })));
      })
      .catch((_err) => {
        if (controller.signal.aborted) return;
        setData([]);
        resultsRef.current = [];
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [debounced]);

  function handleChange (val) {
    setValue(val);
  }

  function handleBlur () {
    form.setFieldValue(field, value);
  }

  function handleOptionSubmit (val) {
    const match = resultsRef.current.find((r) => r.addressLine1 === val);
    if (!match) return;

    setValue(match.addressLine1);
    form.setValues({
      [field]: match.addressLine1,
      city: match.city ?? '',
      state: match.state ?? '',
      postalCode: match.postalCode?.split('-')[0] ?? '',
      latitude: match.latitude ?? '',
      longitude: match.longitude ?? '',
    });
  }

  return (
    <Autocomplete
      ref={ref}
      {...props}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onOptionSubmit={handleOptionSubmit}
      data={data}
      filter={({ options }) => options}
      rightSection={loading ? <Loader size={24} /> : rightSection}
    />
  );
});

export default AddressAutocomplete;
