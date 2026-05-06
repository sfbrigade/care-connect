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
    renderWithEnv({ VITE_ENVIRONMENT_LABEL: 'PROD', VITE_PRODUCTION_URL: 'https://reset.example.com' });
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

  it('renders the production URL as a link when configured', () => {
    renderWithEnv({
      VITE_ENVIRONMENT_LABEL: 'STAGING',
      VITE_PRODUCTION_URL: 'https://reset.careconnect.example.com',
    });
    const link = screen.getByRole('link', { name: /go to careconnect/i });
    expect(link).toHaveAttribute('href', 'https://reset.careconnect.example.com');
  });

  it('omits the link when no production URL is configured', () => {
    renderWithEnv({ VITE_ENVIRONMENT_LABEL: 'DEV' });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  // Anything that's not the literal string PROD must show the banner. This
  // protects against case-sensitivity surprises (e.g. someone typing 'prod').
  it('still shows the banner for case variants of PROD', () => {
    renderWithEnv({ VITE_ENVIRONMENT_LABEL: 'prod' });
    expect(screen.getByTestId('environment-banner')).toBeInTheDocument();
  });
});
