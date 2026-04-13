import { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Alert, Center, Loader } from '@mantine/core';

import FormContainer from 'care-connect-server/lib/forms/shared/FormContainer.jsx';
import FORM_REGISTRY from './formRegistry';

async function fetchFormData (formId, deflectionId) {
  const response = await fetch(`/api/forms/${formId}/data/${deflectionId}`);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `Failed to load form data (${response.status})`);
  }
  return response.json();
}

// Natural page dimensions: 8.5in × 11in at 96 dpi
const PAGE_WIDTH = 816;

export default function FormPreview () {
  const { formId, deflectionId } = useParams();
  const formInfo = FORM_REGISTRY[formId];
  const FormComponent = formInfo?.component;

  // wrapperRef measures available width; pageRef tracks the page's natural height.
  // Both are needed because CSS transform doesn't affect layout flow, so we must
  // explicitly size the wrapper to prevent it from collapsing around scaled content.
  const wrapperRef = useRef(null);
  const pageRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [pageHeight, setPageHeight] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ['form-data', formId, deflectionId],
    queryFn: () => fetchFormData(formId, deflectionId),
    enabled: !!FormComponent && !!deflectionId,
  });

  // Re-run when `data` changes: the page divs don't exist until after the loading
  // guard returns, so the refs are null on first mount. Adding `data` to the dep
  // array ensures the observers are attached once the form is actually rendered.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const page = pageRef.current;
    if (!wrapper || !page) return;

    const wrapperRO = new globalThis.ResizeObserver(([entry]) => {
      setScale(Math.min(1, entry.contentRect.width / PAGE_WIDTH));
    });
    const pageRO = new globalThis.ResizeObserver(([entry]) => {
      setPageHeight(entry.contentRect.height);
    });

    wrapperRO.observe(wrapper);
    pageRO.observe(page);
    return () => { wrapperRO.disconnect(); pageRO.disconnect(); };
  }, [data]);

  if (!formInfo) {
    return (
      <Alert color='red' title='Unknown form' m='md'>
        No form found for ID &quot;{formId}&quot;.
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Center h={200}>
        <Loader />
      </Center>
    );
  }

  if (error) {
    return (
      <Alert color='red' title='Failed to load form' m='md'>
        {error.message}
      </Alert>
    );
  }

  // Drive the outer div's minHeight from the measured page so the gray
  // background always surrounds the white page, even inside Mantine's
  // AppShell grid layout where '100vh' alone isn't enough to push the
  // container below a tall scaled page.
  const outerMinHeight = pageHeight > 0
    ? `max(100vh, ${Math.ceil(pageHeight * scale) + 48}px)`
    : '100vh';

  return (
    <div style={{
      minHeight: outerMinHeight,
      backgroundColor: '#e0e0e0',
      padding: '24px',
    }}
    >
      {/* Wrapper: constrains available width and reserves space for the scaled page */}
      <div
        ref={wrapperRef}
        style={{
          maxWidth: PAGE_WIDTH,
          margin: '0 auto',
          height: pageHeight * scale,
        }}
      >
        {/* Page: rendered at natural size, then scaled down to fit the wrapper */}
        <div
          ref={pageRef}
          style={{
            width: PAGE_WIDTH,
            backgroundColor: '#fff',
            boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
            transformOrigin: 'top left',
            transform: `scale(${scale})`,
          }}
        >
          <FormContainer standalone={false}>
            <FormComponent data={data} />
          </FormContainer>
        </div>
      </div>
    </div>
  );
}
