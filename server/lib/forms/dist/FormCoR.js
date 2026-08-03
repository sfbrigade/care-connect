// lib/forms/pdf/FormCoR.jsx
import { z } from "zod";
import { readFile as readFile2 } from "fs/promises";
import { join as join2 } from "path";

// lib/forms/pdf/fillCoR.js
import { PDFDocument, PDFName, PDFBool, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "fs/promises";
import { join } from "path";
var TEXT = {
  subjectName: "Subjects Name",
  detentionMonth: "Month",
  detentionDate: "Date",
  detentionYear: "Year1",
  detentionTime: "Time",
  subjectName2: "Subjects Name_2",
  releaseMonth: "Month_2",
  releaseDate: "Date_2",
  releaseYear: "Year2",
  releaseTime: "Time_2",
  deputyPrint: "Print",
  unitIdentifier: "Unit Identifier"
};
async function fillCoR(pdfBytes, data) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  pdfDoc.registerFontkit(fontkit);
  const form = pdfDoc.getForm();
  for (const [key, pdfField] of Object.entries(TEXT)) {
    const val = data[key];
    if (val != null && val !== "") {
      form.getTextField(pdfField).setText(String(val));
    }
  }
  if (data.signature) {
    const fontPath = join(process.cwd(), "lib/forms/pdf/fonts/MeowScript-Regular.ttf");
    const fontBytes = await readFile(fontPath);
    const signatureFont = await pdfDoc.embedFont(fontBytes);
    const sigField = form.getTextField("Signature");
    const widgets = sigField.acroField.getWidgets();
    const widget = widgets[0];
    const rect = widget.getRectangle();
    sigField.setText("");
    const page = pdfDoc.getPage(0);
    page.drawText(data.signature, {
      x: rect.x,
      y: rect.y + 4,
      size: 16,
      font: signatureFont,
      color: rgb(0, 0, 0)
    });
  }
  const acroForm = pdfDoc.catalog.lookup(PDFName.of("AcroForm"));
  acroForm.set(PDFName.of("NeedAppearances"), PDFBool.True);
  return pdfDoc.save({ updateFieldAppearances: false });
}

// lib/forms/formUtils.js
var FORM_TIMEZONE = "America/Los_Angeles";
function formatDateOnly(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { timeZone: FORM_TIMEZONE, month: "2-digit", day: "2-digit", year: "numeric" });
}
function formatDateParts(dateStr) {
  if (!dateStr) return { month: "", date: "", year: "" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { month: "", date: "", year: "" };
  const opts = { timeZone: FORM_TIMEZONE };
  return {
    month: d.toLocaleString("en-US", { ...opts, month: "2-digit" }),
    date: d.toLocaleString("en-US", { ...opts, day: "2-digit" }),
    year: d.toLocaleString("en-US", { ...opts, year: "numeric" })
  };
}
function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", { timeZone: FORM_TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false });
}

// lib/forms/pdf/FormCoR.jsx
import { jsx } from "react/jsx-runtime";
var metadata = {
  generatorType: "pdf",
  canGenerate(deflection) {
    return deflection.releasedAt ? true : { message: "The Certificate of Release can only be generated after the subject has been released." };
  },
  deflectionInclude: {
    subject: true,
    incident: {
      include: {
        createdByOrganization: true,
        createdByUnit: true,
        createdByTitle: true
      }
    },
    createdBy: {
      include: {
        organization: true,
        unit: true,
        title: true
      }
    },
    releasedBy: {
      include: {
        organization: true,
        unit: true,
        title: true
      }
    }
  },
  dataSchema: z.object({
    subjectName: z.string(),
    detentionMonth: z.string(),
    detentionDate: z.string(),
    detentionYear: z.string(),
    detentionTime: z.string(),
    releaseMonth: z.string(),
    releaseDate: z.string(),
    releaseYear: z.string(),
    releaseTime: z.string(),
    deputyTitle: z.string(),
    deputyName: z.string(),
    deputyBadge: z.string(),
    unitIdentifier: z.string(),
    narcoticsSubstance: z.boolean().nullable(),
    narcoticsParaphernalia: z.boolean().nullable(),
    cadNumber: z.string(),
    releaseDateFormatted: z.string()
  }),
  transformData(deflection) {
    const subject = deflection.subject;
    const subjectName = subject ? [subject.firstName, subject.middleInitial, subject.lastName].filter(Boolean).join(" ") : "";
    const deputy = deflection.releasedBy || deflection.createdBy;
    const deputyTitle = deputy?.title?.name || "";
    const deputyName = deputy ? `${deputy.firstName} ${deputy.lastName}` : "";
    const deputyBadge = deputy?.badgeNumber || "";
    const unitIdentifier = deflection.incident?.createdByUnit?.name || deputy?.unit?.name || "";
    const detention = formatDateParts(deflection.createdAt?.toISOString());
    const release = formatDateParts(deflection.releasedAt.toISOString());
    return {
      subjectName,
      detentionMonth: detention.month,
      detentionDate: detention.date,
      detentionYear: detention.year,
      detentionTime: formatTime(deflection.createdAt?.toISOString()),
      releaseMonth: release.month,
      releaseDate: release.date,
      releaseYear: release.year,
      releaseTime: formatTime(deflection.releasedAt.toISOString()),
      deputyTitle,
      deputyName,
      deputyBadge,
      unitIdentifier,
      narcoticsSubstance: deflection.narcoticsSubstance,
      narcoticsParaphernalia: deflection.narcoticsParaphernalia,
      cadNumber: deflection.incident?.cadNumber || "",
      releaseDateFormatted: formatDateOnly(deflection.releasedAt.toISOString())
    };
  },
  async generatePdf(deflectionData, user) {
    const templatePath = join2(process.cwd(), "lib/forms/pdf/templates/FormCoR.pdf");
    const templateBytes = await readFile2(templatePath);
    const deputyPrint = [deflectionData.deputyTitle, deflectionData.deputyName, deflectionData.deputyBadge].filter(Boolean).join(" ");
    const formData = {
      subjectName: deflectionData.subjectName,
      subjectName2: deflectionData.subjectName,
      detentionMonth: deflectionData.detentionMonth,
      detentionDate: deflectionData.detentionDate,
      detentionYear: deflectionData.detentionYear,
      detentionTime: deflectionData.detentionTime,
      releaseMonth: deflectionData.releaseMonth,
      releaseDate: deflectionData.releaseDate,
      releaseYear: deflectionData.releaseYear,
      releaseTime: deflectionData.releaseTime,
      deputyPrint,
      unitIdentifier: deflectionData.unitIdentifier,
      signature: `${deflectionData.deputyName} #${deflectionData.deputyBadge}`
    };
    return fillCoR(templateBytes, formData);
  }
};
function FormCoR() {
  return /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: "1rem", fontWeight: "bold" }, children: "No HTML preview available for the Certificate of Release." });
}
export {
  FormCoR as default,
  metadata
};
