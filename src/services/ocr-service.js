/**
 * Mova Campus — OCR & Document Import Service
 *
 * Processes uploaded attendance reports and timetable documents:
 * - Supports PDF, JPG, JPEG, and PNG formats.
 * - Enforces strict file type and size validation (max 10MB).
 * - Multi-page PDF text extraction: extracts digital text across all pages client-side.
 * - Genuine Google Gemini Vision OCR integration when EXPO_PUBLIC_GEMINI_API_KEY is configured.
 * - Complete transparency: Never fabricates fake data or pretends OCR succeeded.
 * - Privacy-first: Never transmits documents externally without required API key configuration.
 * - Seamless fallback to interactive, editable verification tables.
 */

import { logger } from '@/utils/logger';
import {
  parseAttendanceReportText,
  parseCsvAttendance,
  parseTimetableText,
} from '@/utils/ocr-parser';

export const SUPPORTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.csv', '.txt'];
export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'text/csv',
  'text/plain',
  'application/csv',
];
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Validates file format and size.
 *
 * @param {File | { name?: string, size?: number, type?: string }} file
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validateUploadFile(file) {
  if (!file) {
    return { isValid: false, error: 'No file provided.' };
  }

  const name = file.name || '';
  const extMatch = name.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '';

  const isExtValid = SUPPORTED_EXTENSIONS.includes(ext);
  const isMimeValid = file.type ? SUPPORTED_MIME_TYPES.includes(file.type.toLowerCase()) : false;

  if (!isExtValid && !isMimeValid) {
    return {
      isValid: false,
      error: `Unsupported file format. Supported formats: PDF, JPG, PNG, WEBP, CSV, TXT.`,
    };
  }

  if (file.size && file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `File is too large (${sizeMb} MB). Maximum allowed size is 10 MB.`,
    };
  }

  return { isValid: true };
}

/**
 * Extracts raw textual content from a PDF ArrayBuffer client-side across all pages.
 * Decodes string literals in Tj / TJ text operators and handles multi-page streams.
 *
 * @param {ArrayBuffer} arrayBuffer
 * @returns {string}
 */
export function extractTextFromPdfArrayBuffer(arrayBuffer) {
  try {
    const uint8 = new Uint8Array(arrayBuffer);
    const latinDecoder = new TextDecoder('latin1');
    const rawPdf = latinDecoder.decode(uint8);

    const extractedLines = [];

    // 1. Scan for text operators within PDF streams:
    //    BT ... (text) Tj ... ET
    //    BT ... [(t)(e)(x)(t)] TJ ... ET
    const btRegex = /BT[\s\S]*?ET/g;
    let btMatch;

    while ((btMatch = btRegex.exec(rawPdf)) !== null) {
      const block = btMatch[0];
      const lineParts = [];

      // Match simple (text) Tj
      const tjRegex = /\((.*?)\)\s*Tj/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        lineParts.push(cleanPdfString(tjMatch[1]));
      }

      // Match array [(t) (e) (x) (t)] TJ
      const arrayTjRegex = /\[(.*?)\]\s*TJ/g;
      let arrayMatch;
      while ((arrayMatch = arrayTjRegex.exec(block)) !== null) {
        const innerArray = arrayMatch[1];
        const innerStrRegex = /\((.*?)\)/g;
        let strMatch;
        const innerParts = [];
        while ((strMatch = innerStrRegex.exec(innerArray)) !== null) {
          innerParts.push(cleanPdfString(strMatch[1]));
        }
        if (innerParts.length > 0) {
          lineParts.push(innerParts.join(' '));
        }
      }

      // Match hex strings <414243> Tj
      const hexTjRegex = /<([0-9A-Fa-f]+)>\s*Tj/g;
      let hexMatch;
      while ((hexMatch = hexTjRegex.exec(block)) !== null) {
        const hex = hexMatch[1];
        let decoded = '';
        for (let i = 0; i < hex.length; i += 2) {
          decoded += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        }
        lineParts.push(cleanPdfString(decoded));
      }

      if (lineParts.length > 0) {
        extractedLines.push(lineParts.join(' '));
      }
    }

    return extractedLines.join('\n').trim();
  } catch (err) {
    logger.warn('Failed to extract text from PDF buffer', err);
    return '';
  }
}

function cleanPdfString(str) {
  if (!str) return '';
  return str
    .replace(/\\([()\\])/g, '$1')
    .replace(/\\r/g, '\r')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .trim();
}

class OcrService {
  /**
   * Reads a file into a base64 Data URL string.
   */
  async readFileAsDataUrl(fileOrUri) {
    if (typeof fileOrUri === 'string') {
      return { dataUrl: fileOrUri, name: 'uploaded_document', size: fileOrUri.length };
    }

    if (typeof FileReader !== 'undefined' && fileOrUri instanceof Blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            dataUrl: reader.result,
            name: fileOrUri.name || 'uploaded_document',
            size: fileOrUri.size,
          });
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(fileOrUri);
      });
    }

    throw new Error('Unsupported document file format or environment.');
  }

  /**
   * Reads a text/csv file into a plain UTF-8 string.
   */
  async readFileAsText(file) {
    if (typeof file?.text === 'function') {
      return await file.text();
    }
    if (typeof FileReader !== 'undefined' && file instanceof Blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
        reader.readAsText(file);
      });
    }
    throw new Error('Could not read text file contents.');
  }

  /**
   * Reads a file into an ArrayBuffer.
   */
  async readFileAsArrayBuffer(file) {
    if (typeof file?.arrayBuffer === 'function') {
      return await file.arrayBuffer();
    }
    if (typeof FileReader !== 'undefined' && file instanceof Blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
      });
    }
    throw new Error('Could not read file binary buffer.');
  }

  /**
   * Processes an attendance report (PDF, JPG, JPEG, PNG, or pasted text).
   *
   * @param {object} params
   * @param {File | Blob | string} [params.file]
   * @param {string} [params.rawText]
   * @returns {Promise<{ success: boolean, method: string, subjects: Array<object>, message: string, rawText?: string, fileMeta?: object }>}
   */
  async processAttendanceReport({ file, rawText } = {}) {
    try {
      // 1. Direct text parse
      if (rawText && rawText.trim().length > 0) {
        const parsed = parseAttendanceReportText(rawText);
        if (parsed.length > 0) {
          return {
            success: true,
            method: 'text_parse',
            subjects: parsed,
            message: `Extracted ${parsed.length} subjects from text. Review and confirm below.`,
            rawText,
          };
        }
      }

      if (file) {
        // Validate file type & size
        const validation = validateUploadFile(file);
        if (!validation.isValid) {
          return {
            success: false,
            method: 'validation_error',
            subjects: [],
            message: validation.error || 'Invalid file.',
          };
        }

        const isPdf =
          file.type === 'application/pdf' ||
          (typeof file.name === 'string' && file.name.toLowerCase().endsWith('.pdf'));

        const fileName = (file.name || '').toLowerCase();
        const isCsv = fileName.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/csv';
        const isTxt = fileName.endsWith('.txt') || file.type === 'text/plain';

        if (isCsv || isTxt) {
          const text = await this.readFileAsText(file);
          let parsed = parseCsvAttendance(text);
          if (parsed.length === 0) {
            parsed = parseAttendanceReportText(text);
          }
          if (parsed.length > 0) {
            return {
              success: true,
              method: isCsv ? 'csv_parse' : 'text_file_parse',
              subjects: parsed,
              message: `Extracted ${parsed.length} subjects from ${isCsv ? 'CSV spreadsheet' : 'text document'}. Review below before saving.`,
              rawText: text,
              fileMeta: {
                name: file.name,
                size: file.size,
                type: isCsv ? 'CSV Spreadsheet' : 'Text Document',
                isPdf: false,
              },
            };
          }
        }

        const fileMeta = {
          name: file.name || 'document',
          size: file.size || 0,
          type: isPdf ? 'PDF Document' : file.type || 'Image',
          isPdf,
        };

        // If it's a PDF: extract digital text across pages
        if (isPdf) {
          const buffer = await this.readFileAsArrayBuffer(file);
          const pdfText = extractTextFromPdfArrayBuffer(buffer);

          if (pdfText && pdfText.length > 10) {
            const parsed = parseAttendanceReportText(pdfText);
            if (parsed.length > 0) {
              return {
                success: true,
                method: 'pdf_digital_extract',
                subjects: parsed,
                message: `Extracted ${parsed.length} subjects across PDF pages. Review below before saving.`,
                rawText: pdfText,
                fileMeta,
              };
            }
          }
        }

        // If it's an image or scanned PDF without digital text: check Vision API
        const { dataUrl } = await this.readFileAsDataUrl(file);
        const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

        if (apiKey) {
          try {
            const mimeType = isPdf ? 'application/pdf' : file.type || 'image/jpeg';
            const apiRes = await this.callVisionApi(dataUrl, apiKey, 'attendance', mimeType);
            if (apiRes && apiRes.length > 0) {
              return {
                success: true,
                method: 'ai_vision',
                subjects: apiRes,
                message: `Google Gemini Vision OCR extracted ${apiRes.length} subjects. Review below before saving.`,
                fileMeta,
              };
            }
          } catch (apiErr) {
            logger.info('Vision OCR API call failed', apiErr);
          }
        }

        // Transparent report: never fake OCR results
        const explanation = apiKey
          ? 'Could not extract attendance records automatically from this document. Please verify or add your subjects in the table below.'
          : isPdf
          ? 'No selectable digital text detected in this scanned PDF. Document OCR requires EXPO_PUBLIC_GEMINI_API_KEY in .env. Documents are never sent to external servers without configuration. Please enter your subjects in the table below.'
          : 'Automatic image OCR requires EXPO_PUBLIC_GEMINI_API_KEY in .env. Documents are never sent to external servers without configuration. Please enter or paste your attendance details in the table below.';

        return {
          success: false,
          method: 'manual_verification',
          subjects: [],
          message: explanation,
          fileMeta,
        };
      }

      return {
        success: false,
        method: 'none',
        subjects: [],
        message: 'No document or text provided.',
      };
    } catch (err) {
      logger.error('Error in processAttendanceReport', err);
      return {
        success: false,
        method: 'error',
        subjects: [],
        message: err.message || 'Failed to process document.',
      };
    }
  }

  /**
   * Processes a timetable document (PDF, JPG, JPEG, PNG, or pasted text).
   *
   * @param {object} params
   * @param {File | Blob | string} [params.file]
   * @param {string} [params.rawText]
   * @returns {Promise<{ success: boolean, method: string, classes: Array<object>, message: string, rawText?: string, fileMeta?: object }>}
   */
  async processTimetable({ file, rawText } = {}) {
    try {
      if (rawText && rawText.trim().length > 0) {
        const parsed = parseTimetableText(rawText);
        if (parsed.length > 0) {
          return {
            success: true,
            method: 'text_parse',
            classes: parsed,
            message: `Extracted ${parsed.length} timetable slots from text. Review below before saving.`,
            rawText,
          };
        }
      }

      if (file) {
        const validation = validateUploadFile(file);
        if (!validation.isValid) {
          return {
            success: false,
            method: 'validation_error',
            classes: [],
            message: validation.error || 'Invalid file.',
          };
        }

        const isPdf =
          file.type === 'application/pdf' ||
          (typeof file.name === 'string' && file.name.toLowerCase().endsWith('.pdf'));

        const fileName = (file.name || '').toLowerCase();
        const isCsv = fileName.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/csv';
        const isTxt = fileName.endsWith('.txt') || file.type === 'text/plain';

        if (isCsv || isTxt) {
          const text = await this.readFileAsText(file);
          const parsed = parseTimetableText(text);
          if (parsed.length > 0) {
            return {
              success: true,
              method: isCsv ? 'csv_parse' : 'text_file_parse',
              classes: parsed,
              message: `Extracted ${parsed.length} timetable slots from ${isCsv ? 'CSV schedule' : 'text document'}. Review below before saving.`,
              rawText: text,
              fileMeta: {
                name: file.name,
                size: file.size,
                type: isCsv ? 'CSV Schedule' : 'Text Schedule',
                isPdf: false,
              },
            };
          }
        }

        const fileMeta = {
          name: file.name || 'timetable_doc',
          size: file.size || 0,
          type: isPdf ? 'PDF Document' : file.type || 'Image',
          isPdf,
        };

        if (isPdf) {
          const buffer = await this.readFileAsArrayBuffer(file);
          const pdfText = extractTextFromPdfArrayBuffer(buffer);

          if (pdfText && pdfText.length > 10) {
            const parsed = parseTimetableText(pdfText);
            if (parsed.length > 0) {
              return {
                success: true,
                method: 'pdf_digital_extract',
                classes: parsed,
                message: `Extracted ${parsed.length} timetable slots from PDF. Review below before saving.`,
                rawText: pdfText,
                fileMeta,
              };
            }
          }
        }

        const { dataUrl } = await this.readFileAsDataUrl(file);
        const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

        if (apiKey) {
          try {
            const mimeType = isPdf ? 'application/pdf' : file.type || 'image/jpeg';
            const apiRes = await this.callVisionApi(dataUrl, apiKey, 'timetable', mimeType);
            if (apiRes && apiRes.length > 0) {
              return {
                success: true,
                method: 'ai_vision',
                classes: apiRes,
                message: `Extracted ${apiRes.length} schedule classes via Google Gemini Vision. Review below before saving.`,
                fileMeta,
              };
            }
          } catch (apiErr) {
            logger.info('Vision timetable extraction failed', apiErr);
          }
        }

        const explanation = apiKey
          ? 'Could not extract timetable slots automatically from this document. Please check the preview table below to add or adjust classes.'
          : isPdf
          ? 'No selectable digital text detected in this scanned timetable PDF. OCR requires EXPO_PUBLIC_GEMINI_API_KEY in .env. Documents are never sent to external servers without configuration. Please add classes in the table below.'
          : 'Automatic timetable recognition from images requires EXPO_PUBLIC_GEMINI_API_KEY in .env. Documents are never sent to external servers without configuration. Please add classes in the table below.';

        return {
          success: false,
          method: 'manual_verification',
          classes: [],
          message: explanation,
          fileMeta,
        };
      }

      return {
        success: false,
        method: 'none',
        classes: [],
        message: 'No timetable document or text provided.',
      };
    } catch (err) {
      logger.error('Error processing timetable document', err);
      return {
        success: false,
        method: 'error',
        classes: [],
        message: err.message || 'Failed to process timetable document.',
      };
    }
  }

  /**
   * Helper to query Google Gemini Vision API when an API key is provided.
   */
  async callVisionApi(dataUrl, apiKey, kind, mimeType = 'image/jpeg') {
    const prompt =
      kind === 'attendance'
        ? 'Extract table: subject name, attended classes, total classes. Format output strictly as JSON array: [{"name": string, "attended": number, "total": number}]'
        : 'Extract weekly timetable slots: subject name, weekday (number: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday), start_time (HH:MM 24h), end_time (HH:MM 24h), room. Format output strictly as JSON array: [{"subject_name": string, "weekday": number, "start_time": string, "end_time": string, "room": string}]';

    const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!res.ok) throw new Error(`Vision API error: ${res.statusText}`);

    const result = await res.json();
    const textOutput = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) return [];

    const jsonMatch = textOutput.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  }
}

export const ocrService = new OcrService();
