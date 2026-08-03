// lib/forms/jsx/formComponents.jsx
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
function Field({ value, width, label, style = {} }) {
  const valueStyle = width ? { minWidth: width } : { flex: "1" };
  return /* @__PURE__ */ jsxs("span", { className: "field", style, children: [
    /* @__PURE__ */ jsx("span", { className: "value", style: valueStyle, children: value || /* @__PURE__ */ jsx(Fragment, { children: "\xA0" }) }),
    label && /* @__PURE__ */ jsx("span", { className: "label", children: label })
  ] });
}
export {
  Field,
  Header,
  Row,
  SectionHeader
};
