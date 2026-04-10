import React from 'react';

export function Header () {
  return (
    <header>
      Care<span style={{ color: '#888' }}>Connect</span>{' '}
      <span style={{ fontWeight: 'bold', color: '#bbb' }}>RESET</span>
    </header>
  );
}

export function Row ({ label, value, required = false }) {
  return (
    <tr>
      <td className='field-label'>{label}{required && <span className='required'>*</span>}</td>
      <td className='field-value'>{value || ''}</td>
    </tr>
  );
}

export function SectionHeader ({ title }) {
  return (
    <tr className='section-header-row'>
      <td colSpan={2} className='section-header'>{title}</td>
    </tr>
  );
}

/** Underlined inline field with an optional sub-label. */
export function Field ({ value, width, label, style = {} }) {
  const valueStyle = width ? { minWidth: width } : { flex: '1' };

  // include a non-breaking space if the value is empty so that the value line takes up vertical space
  return (
    <span className='field' style={style}>
      <span className='value' style={valueStyle}>{value || <>&nbsp;</>}</span>
      {label && <span className='label'>{label}</span>}
    </span>
  );
}
