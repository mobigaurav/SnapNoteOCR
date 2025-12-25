// src/core/export/exportService.ts
import { Platform } from 'react-native';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import { generatePDF } from 'react-native-html-to-pdf';

// Adjust this import to your note model/type
export type Note = {
  id: string;
  title: string;
  body: string;
  createdAt?: number;
  updatedAt?: number;
};

function safeFilename(input: string) {
  // keep it filesystem-safe
  return (input || 'SnapNote')
    .trim()
    .replace(/[\/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '_')
    .slice(0, 60);
}

function toFileUrl(path: string) {
  // react-native-share on Android is happiest with file://
  if (!path) return '';
  if (path.startsWith('file://') || path.startsWith('content://')) return path;
  return Platform.OS === 'android' ? `file://${path}` : path;
}

function htmlEscape(s: string) {
  return (s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function noteToHtml(note: Note) {
  const title = htmlEscape(note.title || 'Untitled');
  const body = htmlEscape(note.body || '').replace(/\n/g, '<br/>');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, Roboto, Arial, sans-serif; padding: 24px; }
    h1 { font-size: 22px; margin: 0 0 12px; }
    .meta { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
    .content { font-size: 14px; line-height: 1.6; white-space: normal; }
    .footer { margin-top: 24px; color: #9ca3af; font-size: 11px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">Exported from SnapNote</div>
  <div class="content">${body}</div>
  <div class="footer">© SnapNote</div>
</body>
</html>`;
}

/**
 * Generates a PDF and opens share sheet.
 * Throws an Error with a user-friendly message if export fails.
 */
export async function exportNoteAsPdf(note: Note) {
  const base = safeFilename(note.title || 'SnapNote');
  const fileName = `${base}_${Date.now()}`;

  // Use DocumentDirectoryPath which is accessible and safe
  const directory = RNFS.DocumentDirectoryPath;

  const result = await generatePDF({
    html: noteToHtml(note),
    fileName,
    directory: 'Documents', // library uses its own mapping; still returns filePath
  });

  // Some versions return { filePath } (string) OR { filePath: null } on failure
  const rawPath = (result as any)?.filePath as string | undefined;

  if (!rawPath) {
    throw new Error('PDF export failed (no file path returned).');
  }

  // Extra safety: check existence
  const exists = await RNFS.exists(rawPath);
  if (!exists) {
    throw new Error('PDF export failed (file not created).');
  }

  const url = toFileUrl(rawPath);
  if (!url) {
    throw new Error('PDF export failed (invalid file URL).');
  }

  // Open share sheet
  await Share.open({
    url,
    type: 'application/pdf',
    failOnCancel: false,
  });

  return { path: rawPath };
}

/**
 * Writes a TXT file and opens share sheet.
 * Throws an Error with a user-friendly message if export fails.
 */
export async function exportNoteAsTxt(note: Note) {
  const base = safeFilename(note.title || 'SnapNote');
  const fileName = `${base}_${Date.now()}.txt`;

  const path = `${RNFS.DocumentDirectoryPath}/${fileName}`;
  const content = `${note.title || 'Untitled'}\n\n${note.body || ''}\n`;

  await RNFS.writeFile(path, content, 'utf8');

  const exists = await RNFS.exists(path);
  if (!exists) {
    throw new Error('TXT export failed (file not created).');
  }

  const url = toFileUrl(path);
  if (!url) {
    throw new Error('TXT export failed (invalid file URL).');
  }

  await Share.open({
    url,
    type: 'text/plain',
    failOnCancel: false,
  });

  return { path };
}
