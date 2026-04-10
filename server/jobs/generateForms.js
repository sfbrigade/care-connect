import { PDFDocument } from 'pdf-lib';
import prisma from '#prisma/client.js';
import { getFormMetadata } from '#lib/forms/getFormMetadata.js';
import DeflectionDocument from '#models/deflectionDocument.js';

export default async function generateForms (data, prismaClient = prisma) {
  const { deflectionId, userId, formIds } = data;

  const allForms = await getFormMetadata();
  const forms = formIds
    ? Object.fromEntries(Object.entries(allForms).filter(([id]) => formIds.includes(id)))
    : allForms;

  const deflection = await prismaClient.deflection.findUnique({
    where: { id: deflectionId },
    include: {
      subject: true,
      incident: { include: { createdBy: { include: { organization: true, unit: true, title: true } } } },
      facility: true,
      releaseReason: true,
      deflectionDetails: true,
    },
  });
  if (!deflection) return;

  const user = await prismaClient.user.findUnique({ where: { id: userId } });

  for (const [formId, form] of Object.entries(forms)) {
    const check = form.canGenerate(deflection);
    if (check !== true) continue;

    const formData = form.transformData(deflection);
    let pdfBuffer;

    if (form.generatorType === 'pdf') {
      pdfBuffer = Buffer.from(await form.generatePdf(formData, user));
    } else {
      const { renderFormToHtml, renderToPdf } = await import('#lib/pdf.js');
      const { default: FormComponent } = await import(`#lib/forms/dist/${form.componentName}.js`);
      const html = await renderFormToHtml(FormComponent, formData, { title: form.title });
      pdfBuffer = await renderToPdf(html);
    }

    // For the cert form, append narcotics notice as page 2 if narcotics/paraphernalia were seized
    if (formId === 'cert' && (formData.narcoticsSubstance || formData.narcoticsParaphernalia)) {
      const { renderFormToHtml, renderToPdf } = await import('#lib/pdf.js');
      const { default: FormNarcoticsNotice } = await import('#lib/forms/dist/FormNarcoticsNotice.js');

      const noticeData = {
        date: formData.releaseDateFormatted,
        cadNumber: formData.cadNumber,
        substanceSeized: formData.narcoticsSubstance === true,
        paraphernaliaSeized: formData.narcoticsParaphernalia === true,
      };

      const noticeHtml = await renderFormToHtml(FormNarcoticsNotice, noticeData, { title: 'Narcotics Notice' });
      const noticeBytes = await renderToPdf(noticeHtml);

      const certDoc = await PDFDocument.load(pdfBuffer);
      const noticeDoc = await PDFDocument.load(noticeBytes);
      const copiedPages = await certDoc.copyPages(noticeDoc, noticeDoc.getPageIndices());
      for (const page of copiedPages) {
        certDoc.addPage(page);
      }
      pdfBuffer = Buffer.from(await certDoc.save());
    }

    const filename = form.downloadFilename(deflectionId);

    const existing = await prismaClient.deflectionDocument.findUnique({
      where: { deflectionId_formId: { deflectionId, formId } },
    });

    if (existing) {
      const doc = new DeflectionDocument(existing);
      const assetHandler = doc.setAsset('file', filename, { buffer: pdfBuffer });
      await prismaClient.deflectionDocument.update({
        where: { id: existing.id },
        data: { file: filename, updatedById: userId },
      });
      await assetHandler();
    } else {
      const doc = new DeflectionDocument({ formId, deflectionId });
      const assetHandler = doc.setAsset('file', filename, { buffer: pdfBuffer });
      const record = await prismaClient.deflectionDocument.create({
        data: {
          deflectionId,
          formId,
          file: filename,
          createdById: userId,
          updatedById: userId,
        },
      });
      await assetHandler({ id: record.id });
    }
  }
}
