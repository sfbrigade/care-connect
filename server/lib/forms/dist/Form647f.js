// lib/forms/647f/Form647f.jsx
import React2 from "react";

// lib/forms/shared/formUtils.js
var FORM_TIMEZONE = "America/Los_Angeles";
function formatDateTime24(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const date = d.toLocaleString("en-US", { timeZone: FORM_TIMEZONE, month: "2-digit", day: "2-digit", year: "numeric" });
  const time = d.toLocaleString("en-US", { timeZone: FORM_TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false }).replace("24:", "00:");
  return `${date} ${time}`;
}
function formatDateOnly(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { timeZone: FORM_TIMEZONE, month: "2-digit", day: "2-digit", year: "numeric" });
}
function titleCase(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
function joinWords(...words) {
  return words.filter(Boolean).join(" ");
}

// lib/forms/shared/formComponents.jsx
import React from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
function Header() {
  return /* @__PURE__ */ jsxs("header", { children: [
    "Care",
    /* @__PURE__ */ jsx("span", { style: { color: "#888" }, children: "Connect" }),
    " ",
    /* @__PURE__ */ jsx("span", { style: { fontWeight: "bold", color: "#bbb" }, children: "RESET" })
  ] });
}
function Row({ label, value, required = false }) {
  return /* @__PURE__ */ jsxs("tr", { children: [
    /* @__PURE__ */ jsxs("td", { className: "field-label", children: [
      label,
      required && /* @__PURE__ */ jsx("span", { className: "required", children: "*" })
    ] }),
    /* @__PURE__ */ jsx("td", { className: "field-value", children: value || "" })
  ] });
}
function SectionHeader({ title }) {
  return /* @__PURE__ */ jsx("tr", { className: "section-header-row", children: /* @__PURE__ */ jsx("td", { colSpan: 2, className: "section-header", children: title }) });
}

// lib/forms/647f/Form647f.jsx
import { Fragment as Fragment2, jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var pageCSS = `
  .form-container .page.form-647f {
    height: auto !important;
    min-height: calc(11in - var(--page-margin-top) - var(--page-margin-bottom));
  }
  .form-container .page.form-647f footer {
    position: static;
    margin-top: 1.5em;
  }
  @media screen {
    .form-container .page.form-647f {
      padding: var(--page-margin-top) var(--page-margin-right) var(--page-margin-bottom) var(--page-margin-left);
    }
    .form-container .page.form-647f footer {
      bottom: auto;
      left: auto;
      right: auto;
    }
  }
`;
function Form647f({ data = {} }) {
  const {
    subjectLastName = "",
    subjectFirstName = "",
    subjectMiddleInitial = "",
    subjectRace = "",
    subjectSex = "",
    subjectDOB = null,
    subjectAddress = "",
    subjectDL = "",
    subjectLocalId = "",
    arrestedAt = null,
    arrestLocation = "",
    charge = "",
    cadNumber = "",
    arrestingOfficerRank = "",
    arrestingOfficerName = "",
    arrestingOfficerBadge = "",
    arrestingOfficerUnit = "",
    arrestingOfficerAgency = "",
    supervisorBadgeNumber = "",
    custodyReleaseOfficerRank = "",
    custodyReleaseOfficerName = "",
    custodyReleaseOfficerBadge = "",
    justification = "",
    hospitalCancellationReleaseNarrative = "",
    substanceFound = false,
    paraphernaliaFound = false,
    deflectionId = "",
    facilityName = "",
    facilityAddress = ""
  } = data;
  const arrestingOfficerDisplay = joinWords(arrestingOfficerRank, arrestingOfficerName, arrestingOfficerBadge && `#${arrestingOfficerBadge}`);
  const custodyReleaseOfficerDisplay = joinWords(custodyReleaseOfficerRank, custodyReleaseOfficerName, custodyReleaseOfficerBadge && `#${custodyReleaseOfficerBadge}`);
  const substanceNot = substanceFound ? "" : "not ";
  const paraphernaliaNot = paraphernaliaFound ? "" : "not ";
  const narcoticsStatement = `SFPD Officer searched for narcotics. Subject was ${substanceNot}found to be in possession of a controlled substance. Subject was ${paraphernaliaNot}found to be in possession of narcotics paraphernalia.`;
  const narrative = [justification, narcoticsStatement, hospitalCancellationReleaseNarrative].filter(Boolean).join("\n\n");
  return /* @__PURE__ */ jsxs2(Fragment2, { children: [
    /* @__PURE__ */ jsx2("style", { dangerouslySetInnerHTML: { __html: pageCSS } }),
    /* @__PURE__ */ jsxs2("div", { className: "page form-647f", children: [
      /* @__PURE__ */ jsx2(Header, {}),
      /* @__PURE__ */ jsx2("h1", { className: "title", children: "647(f) Transfer Form" }),
      /* @__PURE__ */ jsx2("table", { className: "form-table", children: /* @__PURE__ */ jsxs2("tbody", { children: [
        /* @__PURE__ */ jsx2(SectionHeader, { title: "Subject Information" }),
        /* @__PURE__ */ jsx2(Row, { label: "Subject Last Name", value: subjectLastName }),
        /* @__PURE__ */ jsx2(Row, { label: "Subject First Name", value: subjectFirstName }),
        /* @__PURE__ */ jsx2(Row, { label: "Subject Middle Initial", value: subjectMiddleInitial }),
        /* @__PURE__ */ jsx2(Row, { label: "Race", value: titleCase(subjectRace) }),
        /* @__PURE__ */ jsx2(Row, { label: "Sex", value: titleCase(subjectSex) }),
        /* @__PURE__ */ jsx2(Row, { label: "Date of Birth (DOB)", value: formatDateOnly(subjectDOB) }),
        /* @__PURE__ */ jsx2(Row, { label: "Address", value: subjectAddress }),
        /* @__PURE__ */ jsx2(Row, { label: "Driver's License", value: subjectDL }),
        /* @__PURE__ */ jsx2(Row, { label: "Local ID / SF #", value: subjectLocalId }),
        /* @__PURE__ */ jsx2(SectionHeader, { title: "Custodial Arrest Information" }),
        /* @__PURE__ */ jsx2(Row, { label: "Date/Time Arrested", value: formatDateTime24(arrestedAt) }),
        /* @__PURE__ */ jsx2(Row, { label: "Location Arrested", value: arrestLocation }),
        /* @__PURE__ */ jsx2(Row, { label: "Charge", value: charge || "647(f) RWS" }),
        /* @__PURE__ */ jsx2(Row, { label: "CAD Number", value: cadNumber }),
        /* @__PURE__ */ jsx2(SectionHeader, { title: "Officer Information" }),
        /* @__PURE__ */ jsx2(Row, { label: "Arresting Officer", value: arrestingOfficerDisplay }),
        /* @__PURE__ */ jsx2(Row, { label: "Unit", value: arrestingOfficerUnit }),
        /* @__PURE__ */ jsx2(Row, { label: "Agency", value: arrestingOfficerAgency }),
        /* @__PURE__ */ jsx2(Row, { label: "Supervising Sergeant's Star Number", value: supervisorBadgeNumber }),
        /* @__PURE__ */ jsx2(Row, { label: "Officer Present at Custody Transfer", value: custodyReleaseOfficerDisplay }),
        /* @__PURE__ */ jsx2(SectionHeader, { title: "Additional Information" }),
        /* @__PURE__ */ jsx2(Row, { label: "Hold ID", value: String(deflectionId) }),
        facilityName && /* @__PURE__ */ jsx2(Row, { label: "Facility", value: facilityName }),
        facilityAddress && /* @__PURE__ */ jsx2(Row, { label: "Facility Address", value: facilityAddress })
      ] }) }),
      /* @__PURE__ */ jsxs2("div", { className: "narrative-section", children: [
        /* @__PURE__ */ jsx2("div", { className: "narrative-label", children: "647(f) RWS Justification / Narrative" }),
        /* @__PURE__ */ jsx2("div", { className: "narrative-text", children: narrative })
      ] }),
      /* @__PURE__ */ jsx2("footer", { children: /* @__PURE__ */ jsxs2("span", { children: [
        "Generated ",
        (/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: FORM_TIMEZONE, hour12: false })
      ] }) })
    ] })
  ] });
}
export {
  Form647f as default
};
