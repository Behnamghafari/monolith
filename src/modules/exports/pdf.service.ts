import { PassThrough } from 'node:stream';
import puppeteer from 'puppeteer-core';
import { AppError } from '../../shared/errors/app-error.js';

export class PdfExportService {
  constructor(private endpoint?: string) {}
  async render(html: string) {
    if (!this.endpoint) throw new AppError(503, 'EXPORT_SERVICE_UNAVAILABLE', 'Browser endpoint is not configured');
    const browser = await puppeteer.connect({ browserWSEndpoint: this.endpoint }); const page = await browser.newPage();
    try { await page.setRequestInterception(true); page.on('request', (r) => r.url().startsWith('data:') ? r.continue() : r.abort()); await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10_000 }); const bytes = await page.pdf({ format: 'A4', printBackground: true }); return PassThrough.from(bytes); }
    finally { await page.close(); browser.disconnect(); }
  }
}
