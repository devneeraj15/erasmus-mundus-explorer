/**
 * Reads CV text in the browser. Nothing is uploaded: files are read with the
 * File API and parsed locally (pdf.js for PDF, mammoth for DOCX). The pdf.js
 * worker is bundled with the site, so no third-party server is contacted.
 */
export const MAX_CV_BYTES = 10 * 1024 * 1024;
export const ACCEPT = ".pdf,.docx,.txt,.md,.rtf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

export class CvReadError extends Error {}

export async function extractCvText(file: File): Promise<string> {
  if (file.size > MAX_CV_BYTES) throw new CvReadError("That file is over 10 MB. Try a smaller export of your CV, or paste the text instead.");
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf") || file.type === "application/pdf") return readPdf(file);
  if (name.endsWith(".docx")) return readDocx(file);
  if (name.endsWith(".doc")) throw new CvReadError("Old .doc files can't be read in the browser. Save it as .docx or PDF, or paste the text.");
  if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".rtf") || file.type.startsWith("text/")) return file.text();
  throw new CvReadError("Unsupported file type. Use PDF, DOCX or a text file, or paste the text.");
}

async function readPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= Math.min(doc.numPages, 20); i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((it) => ("str" in it ? it.str : "")).join(" "));
  }
  await doc.destroy();
  const text = pages.join("\n");
  if (text.replace(/\s/g, "").length < 40) {
    throw new CvReadError("No text found in this PDF. It may be a scanned image. Paste your CV text below instead.");
  }
  return text;
}

async function readDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return value;
}
