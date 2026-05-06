import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';

import EnvironmentBanner from './EnvironmentBanner';
import { staticContext } from '@/StaticContext';

function renderWithEnv (env) {
  return render(
    <MantineProvider>
      <staticContext.Provider value={{ env }}>
        <EnvironmentBanner />
      </staticContext.Provider>
    </MantineProvider>
  );
}

afterEach(() => {
  cleanup();
});

describe('EnvironmentBanner', () => {
  it('renders nothing when label is PROD', () => {
    renderWithEnv({ VITE_ENVIRONMENT_LABEL: 'PROD', VITE_PRODUCTION_URL_OVERRIDE: 'https://reset.example.com' });
    expect(screen.queryByTestId('environment-banner')).not.toBeInTheDocument();
  });

  it('renders the test-site warning when no label is set', () => {
    renderWithEnv({});
    expect(screen.getByTestId('environment-banner')).toBeInTheDocument();
    expect(screen.getByText(/this is a test site/i)).toBeInTheDocument();
  });

  it('renders the same copy regardless of label name', () => {
    // Copy is layperson-facing and intentionally does not vary by env label.
    renderWithEnv({ VITE_ENVIRONMENT_LABEL: 'DEV' });
    expect(screen.getByText(/this is a test site/i)).toBeInTheDocument();
  });

  it('uses VITE_PRODUCTION_URL_OVERRIDE as the link target when configured', () => {
    // (sanity: the override wins over the hardcoded fallback)
    renderWithEnv({
      VITE_ENVIRONMENT_LABEL: 'STAGING',
      VITE_PRODUCTION_URL_OVERRIDE: 'https://reset.careconnect.example.com',
    });
    const link = screen.getByRole('link', { name: /go to careconnect/i });
    expect(link).toHaveAttribute('href', 'https://reset.careconnect.example.com');
  });

  it('falls back to a hardcoded URL when no override is configured', () => {
    // Defense in depth: a misconfigured deploy without VITE_PRODUCTION_URL_OVERRIDE must
    // still surface a working escape link, otherwise users get stranded on a
    // banner that says "go to prod" with no way to actually get there.
    renderWithEnv({ VITE_ENVIRONMENT_LABEL: 'DEV' });
    const link = screen.getByRole('link', { name: /go to careconnect/i });
    expect(link).toHaveAttribute('href', expect.stringMatching(/^https?:\/\//));
    expect(link.getAttribute('href')).not.toBe('');
  });

  // Anything that's not the literal string PROD must show the banner. This
  // protects against case-sensitivity surprises (e.g. someone typing 'prod').
  it('still shows the banner for case variants of PROD', () => {
    renderWithEnv({ VITE_ENVIRONMENT_LABEL: 'prod' });
    expect(screen.getByTestId('environment-banner')).toBeInTheDocument();
  });
});
