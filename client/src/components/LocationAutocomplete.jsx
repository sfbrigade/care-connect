import { forwardRef, useEffect, useRef, useState } from 'react';
import { Autocomplete, Loader } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';

import Api from '@/Api';

/**
 * Unified address-or-intersection autocomplete for the incident Location field.
 *
 * Detects intersection-style input (e.g. "16th & Valencia", "Mission and 24th")
 * from a connector token and switches the backend call between
 *   /api/geocode/search        (address typeahead, AWS Location)
 *   /api/geocode/intersections (DataSF intersection index)
 *
 * On select:
 *   - address  → form.setValues({ locationType:'ADDRESS', addressLine1, city, state, postalCode, latitude, longitude })
 *               + clears street1/street2/intersectionId
 *   - intersection → form.setValues({ locationType:'INTERSECTION', street1, street2, intersectionId, latitude, longitude, city:'San Francisco', state:'CA' })
 *               + clears addressLine1/addressLine2/postalCode
 */

// Match a connector token between two non-empty sides.
const INTERSECTION_RE = /[&/@\\|]|\b(and|at)\b/i;

function detectIntersectionMode (text) {
  if (!text || text.length < 3) return false;
  // Numeric leading digit + non-ordinal letter looks like an address ("425 Mission St")
  if (/^\d+\s+[A-Za-z]/.test(text) && !/^\d+(st|nd|rd|th)\b/i.test(text)) return false;
  return INTERSECTION_RE.test(text);
}

const LocationAutocomplete = forwardRef(function LocationAutocomplete ({ form, rightSection, ...props }, ref) {
  const formValues = form.getValues();
  const initialDisplay = formValues.locationType === 'INTERSECTION'
    ? [formValues.street1, formValues.street2].filter(Boolean).join(' & ')
    : (formValues.addressLine1 ?? '');
  const [value, setValue] = useState(initialDisplay);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const resultsRef = useRef({ mode: null, items: [] });
  const abortControllerRef = useRef(null);
  const [debounced] = useDebouncedValue(value, 300);

  useEffect(() => {
    if (!debounced || debounced.length < 3) {
      setData([]);
      resultsRef.current = { mode: null, items: [] };
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);

    const intersectionMode = detectIntersectionMode(debounced);
    const apiCall = intersectionMode
      ? Api.geocode.intersections(debounced, { signal: controller.signal })
      : Api.geocode.search(debounced, { signal: controller.signal });

    apiCall
      .then((response) => {
        if (controller.signal.aborted) return;
        const items = response?.data ?? [];
        resultsRef.current = { mode: intersectionMode ? 'INTERSECTION' : 'ADDRESS', items };
        if (intersectionMode) {
          setData(items
            .filter((r) => r.cnn)
            .map((r) => ({ value: r.cnn, label: `⌗  ${r.label}` })));
        } else {
          setData(items
            .filter((r) => r.placeId && r.addressLine1)
            .map((r) => ({
              value: r.placeId,
              label: r.neighborhood ? `📍  ${r.addressLine1} (${r.neighborhood})` : `📍  ${r.addressLine1}`,
            })));
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error('Location search failed:', err);
        setData([]);
        resultsRef.current = { mode: null, items: [] };
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [debounced]);

  function handleChange (val) {
    setValue(val);
  }

  function handleFocus (e) {
    e.target.select();
  }

  function handleBlur () {
    // Free-text save: only persist into the form if we know the current mode.
    // For unmatched text, leave the form's current addressLine1 alone — the
    // explicit suggestion-pick is the path that writes through to the form.
  }

  function handleOptionSubmit (key) {
    const { mode, items } = resultsRef.current;
    const match = items.find((r) => (mode === 'INTERSECTION' ? r.cnn : r.placeId) === key);
    if (!match) return;

    if (mode === 'INTERSECTION') {
      const label = `${match.street1Display} & ${match.street2Display}`;
      setValue(label);
      form.setValues({
        locationType: 'INTERSECTION',
        street1: match.street1Display,
        street2: match.street2Display,
        intersectionId: match.cnn,
        city: 'San Francisco',
        state: 'CA',
        latitude: match.latitude,
        longitude: match.longitude,
        addressLine1: null,
        addressLine2: null,
        postalCode: null,
      });
    } else {
      setValue(match.addressLine1);
      form.setValues({
        locationType: 'ADDRESS',
        addressLine1: match.addressLine1,
        city: match.city ?? '',
        state: match.state ?? '',
        postalCode: match.postalCode?.split('-')[0] ?? '',
        latitude: match.latitude ?? '',
        longitude: match.longitude ?? '',
        street1: null,
        street2: null,
        intersectionId: null,
      });
    }
  }

  return (
    <Autocomplete
      ref={ref}
      {...props}
      value={value}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onOptionSubmit={handleOptionSubmit}
      data={data}
      filter={({ options }) => options}
      rightSection={loading ? <Loader size={24} /> : rightSection}
    />
  );
});

export default LocationAutocomplete;
