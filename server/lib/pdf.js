import { existsSync } from 'fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import puppeteer from 'puppeteer-core';

// Probe common paths in order of preference; CHROMIUM_PATH env var overrides all.
const CHROMIUM_CANDIDATES = [
  process.env.CHROMIUM_PATH,
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
].filter(Boolean);

function getChromiumExecutable () {
  for (const p of CHROMIUM_CANDIDATES) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    'Chromium executable not found. Install the "chromium" system package or set the CHROMIUM_PATH environment variable.'
  );
}

/**
 * Renders a React form component to a full HTML document string.
 * The component must return a complete <html> element (including <head> with styles).
 */
export function renderFormToHtml (FormComponent, data) {
  const markup = renderToStaticMarkup(React.createElement(FormComponent, { data }));
  return '<!DOCTYPE html>' + markup;
}

/**
 * Renders an HTML string to a PDF buffer using headless Chromium via puppeteer-core.
 *
 * @param {string} html - Full HTML document string
 * @param {object} [options]
 * @param {string} [options.format='Letter'] - Paper size (Puppeteer format string)
 * @param {object} [options.margin] - Page margins ({ top, right, bottom, left })
 * @param {boolean} [options.printBackground=true] - Include background colours/images
 * @returns {Promise<Buffer>} PDF binary
 */
export async function renderToPdf (html, options = {}) {
  const executablePath = getChromiumExecutable();

  const browser = await puppeteer.launch({
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return await page.pdf({
      format: options.format || 'Letter',
      margin: options.margin,
      printBackground: options.printBackground ?? true,
    });
  } finally {
    await browser.close();
  }
}
