import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const h = React.createElement;

vi.mock('@tabler/icons-react', () => ({
  IconX: () => null,
}));

vi.mock('@mantine/core', () => {
  const passthrough = (tag) => ({ children, ...props }) => React.createElement(tag, props, children);
  return {
    ActionIcon: ({ children, ...props }) => React.createElement('button', props, children),
    Button: ({ children, ...props }) => React.createElement('button', props, children),
    Group: passthrough('div'),
    Modal: ({ opened, children }) => (opened ? React.createElement('div', null, children) : null),
    Stack: passthrough('div'),
    Text: passthrough('p'),
    Title: passthrough('h3'),
  };
});

let File647fModal;

describe('File647fModal', () => {
  beforeAll(async () => {
    File647fModal = (await import('./File647fModal')).default;
  });

  it('renders updated save-confirmation copy', () => {
    const html = renderToStaticMarkup(h(File647fModal, {
      opened: true,
      onClose: vi.fn(),
      onConfirm: vi.fn(),
      loading: false,
    }));

    expect(html).toContain('Save changes?');
    expect(html).toContain('These updates will be saved. When legal release is completed, a new 647(f) record will be created and filed with SFPD.');
    expect(html).not.toContain('Save changes and file a new 647(f)?');
    expect(html).not.toContain('The existing 647(f) will remain on file as a prior version.');
  });
});
