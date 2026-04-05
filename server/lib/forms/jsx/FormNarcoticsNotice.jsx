import React from 'react';
import { z } from 'zod';
import { formatDateOnly } from '../formUtils.js';

const pageCSS = `
  .form-container .page.form-narcotics-notice {
    height: auto !important;
    min-height: calc(11in - var(--page-margin-top) - var(--page-margin-bottom));
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.5;
  }
  .form-container .page.form-narcotics-notice h1 {
    font-size: 16pt;
    font-weight: bold;
    text-align: center;
    margin: 0 0 0.25em;
  }
  .form-container .page.form-narcotics-notice .address-block {
    text-align: center;
    font-size: 10pt;
    margin-bottom: 1em;
  }
  .form-container .page.form-narcotics-notice .fields {
    text-align: right;
    margin-bottom: 1em;
  }
  .form-container .page.form-narcotics-notice .fields span {
    display: inline-block;
    min-width: 12em;
    border-bottom: 1px solid #000;
    margin-left: 0.5em;
    padding: 0 0.25em;
  }
  .form-container .page.form-narcotics-notice .notice-title {
    font-size: 14pt;
    font-weight: bold;
    text-align: center;
    margin: 1em 0;
  }
  .form-container .page.form-narcotics-notice .seized-items {
    margin: 1em 0 1em 2em;
  }
  .form-container .page.form-narcotics-notice .seized-items label {
    display: block;
    margin: 0.25em 0;
  }
  .form-container .page.form-narcotics-notice .seized-items input[type="checkbox"] {
    margin-right: 0.5em;
  }
  .form-container .page.form-narcotics-notice footer {
    position: static;
    margin-top: 2em;
    font-size: 8pt;
    text-align: center;
  }
`;

export const metadata = {
  canGenerate (deflection) {
    if (!deflection.releasedAt) {
      return { message: 'The Narcotics Notice can only be generated after the subject has been released.' };
    }
    if (!deflection.narcoticsSubstance && !deflection.narcoticsParaphernalia) {
      return { message: 'The Narcotics Notice is only required when narcotics or paraphernalia were seized.' };
    }
    return true;
  },

  deflectionInclude: {
    subject: true,
    incident: true,
  },

  dataSchema: z.object({
    date: z.string(),
    cadNumber: z.string(),
    substanceSeized: z.boolean(),
    paraphernaliaSeized: z.boolean(),
    drugType: z.string().nullable(),
  }),

  transformData (deflection) {
    return {
      date: formatDateOnly(deflection.releasedAt.toISOString()),
      cadNumber: deflection.incident?.cadNumber || '',
      substanceSeized: deflection.narcoticsSubstance === true,
      paraphernaliaSeized: deflection.narcoticsParaphernalia === true,
      drugType: deflection.drugType || null,
    };
  },
};

export default function FormNarcoticsNotice ({ data = {} }) {
  const {
    date = '',
    cadNumber = '',
    substanceSeized = false,
    paraphernaliaSeized = false,
  } = data;

  return (
    <>
      <style>{pageCSS}</style>
      <div className='page form-narcotics-notice'>
        <h1>San Francisco Police Department</h1>
        <div className='address-block'>
          Thomas J. Cahill Hall of Justice<br />
          850 Bryant Street<br />
          San Francisco, CA 94103
        </div>

        <div className='fields'>
          <div>Date: <span>{date}</span></div>
          <div>CAD # <span>{cadNumber}</span></div>
        </div>

        <div className='notice-title'>
          NOTICE TO OWNER:<br />
          SFPD Custody of Contraband Property,<br />
          Destruction After 30 Days
        </div>

        <p>
          On the date listed at the top right of this form, officers of the San Francisco
          Police Dept. (SFPD) seized the following property from you:
        </p>

        <div className='seized-items'>
          <label>
            <input type='checkbox' checked={substanceSeized} readOnly />
            Suspected controlled substance
          </label>
          <label>
            <input type='checkbox' checked={paraphernaliaSeized} readOnly />
            Paraphernalia for consuming a controlled substance
          </label>
        </div>

        <p>
          SFPD officers seized this property from you based on probable cause to
          believe this property is contraband. The SFPD now has custody of this
          property and will hold it under the &ldquo;CAD&rdquo; number listed at the top right of this
          form.
        </p>

        <p>
          The SFPD cannot lawfully return or release contraband (property that is
          unlawful to possess). A pipe, device, contrivance, instrument, or paraphernalia
          used for unlawfully smoking, injecting or consuming a controlled substance is
          contraband. (Health &amp; Safety Code &sect; 11364, subd. (a).) Controlled substances
          possessed in a form, amount or manner that violates the Uniform Controlled
          Substances Act are contraband. (Health &amp; Safety Code &sect;&sect; 11000 through
          11674.)
        </p>

        <p>
          Once 30 days have elapsed since the SFPD seized this property from you, the
          SFPD will seek to destroy this property.
        </p>
      </div>
    </>
  );
}
