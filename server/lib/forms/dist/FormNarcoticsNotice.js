// lib/forms/jsx/FormNarcoticsNotice.jsx
import React from "react";
import { z } from "zod";

// lib/forms/formUtils.js
var FORM_TIMEZONE = "America/Los_Angeles";
function formatDateOnly(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { timeZone: FORM_TIMEZONE, month: "2-digit", day: "2-digit", year: "numeric" });
}

// lib/forms/jsx/FormNarcoticsNotice.jsx
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var pageCSS = `
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
var metadata = {
  canGenerate(deflection) {
    if (!deflection.releasedAt) {
      return { message: "The Narcotics Notice can only be generated after the subject has been released." };
    }
    if (!deflection.narcoticsSubstance && !deflection.narcoticsParaphernalia) {
      return { message: "The Narcotics Notice is only required when narcotics or paraphernalia were seized." };
    }
    return true;
  },
  deflectionInclude: {
    subject: true,
    incident: true
  },
  dataSchema: z.object({
    date: z.string(),
    cadNumber: z.string(),
    substanceSeized: z.boolean(),
    paraphernaliaSeized: z.boolean(),
    drugType: z.string().nullable()
  }),
  transformData(deflection) {
    return {
      date: formatDateOnly(deflection.releasedAt.toISOString()),
      cadNumber: deflection.incident?.cadNumber || "",
      substanceSeized: deflection.narcoticsSubstance === true,
      paraphernaliaSeized: deflection.narcoticsParaphernalia === true,
      drugType: deflection.drugType || null
    };
  }
};
function FormNarcoticsNotice({ data = {} }) {
  const {
    date = "",
    cadNumber = "",
    substanceSeized = false,
    paraphernaliaSeized = false
  } = data;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("style", { children: pageCSS }),
    /* @__PURE__ */ jsxs("div", { className: "page form-narcotics-notice", children: [
      /* @__PURE__ */ jsx("h1", { children: "San Francisco Police Department" }),
      /* @__PURE__ */ jsxs("div", { className: "address-block", children: [
        "Thomas J. Cahill Hall of Justice",
        /* @__PURE__ */ jsx("br", {}),
        "850 Bryant Street",
        /* @__PURE__ */ jsx("br", {}),
        "San Francisco, CA 94103"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "fields", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          "Date: ",
          /* @__PURE__ */ jsx("span", { children: date })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          "CAD # ",
          /* @__PURE__ */ jsx("span", { children: cadNumber })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "notice-title", children: [
        "NOTICE TO OWNER:",
        /* @__PURE__ */ jsx("br", {}),
        "SFPD Custody of Contraband Property,",
        /* @__PURE__ */ jsx("br", {}),
        "Destruction After 30 Days"
      ] }),
      /* @__PURE__ */ jsx("p", { children: "On the date listed at the top right of this form, officers of the San Francisco Police Dept. (SFPD) seized the following property from you:" }),
      /* @__PURE__ */ jsxs("div", { className: "seized-items", children: [
        /* @__PURE__ */ jsxs("label", { children: [
          /* @__PURE__ */ jsx("input", { type: "checkbox", checked: substanceSeized, readOnly: true }),
          "Suspected controlled substance"
        ] }),
        /* @__PURE__ */ jsxs("label", { children: [
          /* @__PURE__ */ jsx("input", { type: "checkbox", checked: paraphernaliaSeized, readOnly: true }),
          "Paraphernalia for consuming a controlled substance"
        ] })
      ] }),
      /* @__PURE__ */ jsx("p", { children: "SFPD officers seized this property from you based on probable cause to believe this property is contraband. The SFPD now has custody of this property and will hold it under the \u201CCAD\u201D number listed at the top right of this form." }),
      /* @__PURE__ */ jsx("p", { children: "The SFPD cannot lawfully return or release contraband (property that is unlawful to possess). A pipe, device, contrivance, instrument, or paraphernalia used for unlawfully smoking, injecting or consuming a controlled substance is contraband. (Health & Safety Code \xA7 11364, subd. (a).) Controlled substances possessed in a form, amount or manner that violates the Uniform Controlled Substances Act are contraband. (Health & Safety Code \xA7\xA7 11000 through 11674.)" }),
      /* @__PURE__ */ jsx("p", { children: "Once 30 days have elapsed since the SFPD seized this property from you, the SFPD will seek to destroy this property." })
    ] })
  ] });
}
export {
  FormNarcoticsNotice as default,
  metadata
};
