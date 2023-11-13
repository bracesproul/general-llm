import { writeFile, unlink } from 'node:fs/promises';
import axios from 'axios';
import { Document } from 'langchain/document';
import { UnstructuredLoader } from 'langchain/document_loaders/fs/unstructured';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { formatDocumentsAsString } from 'langchain/util/document';
import {
  NOTE_PROMPT,
  NOTES_TOOL_SCHEMA,
  notesOutputParser,
} from './prompts.js';
import { ArxivNotes } from '../types.js';
import { SupabaseDatabase } from '../database.js';
import { deletePagesFromPdf } from './utils.js';

/**
 * Download a PDF from a URL and return the PDF as a Buffer.
 *
 * @param {string} url The URL to the PDF to return.
 * @returns {Promise<Buffer>} The buffer containing the PDF.
 */
async function loadPdfFromUrl(url: string): Promise<Buffer> {
  try {
    const response = await axios({
      method: 'GET',
      url,
      responseType: 'arraybuffer',
    });

    return Buffer.from(response.data, 'binary');
  } catch (error: any) {
    // handle error.
    console.error('Error downloading PDF from URL: ', error);
    throw error;
  }
}

async function generateNotes(
  documents: Array<Document>
): Promise<Array<ArxivNotes>> {
  const documentsAsString = formatDocumentsAsString(documents, '\n');
  const model = new ChatOpenAI({
    modelName: 'gpt-4-1106-preview',
    temperature: 0,
  });
  const modelWithTools = model.bind({
    tools: [NOTES_TOOL_SCHEMA],
    tool_choice: 'auto',
  });
  const chain = NOTE_PROMPT.pipe(modelWithTools).pipe(notesOutputParser);
  const response = await chain.invoke({
    paper: documentsAsString,
  });
  return response;
}

async function convertPdfToDocuments(pdf: Buffer): Promise<Array<Document>> {
  if (!process.env.UNSTRUCTURED_API_KEY) {
    throw new Error('Missing UNSTRUCTURED_API_KEY');
  }
  /**
   * Unstructured can not read from a buffer, so we need to write
   * the buffer to a file and then read it back in.
   *
   * Use a random name to avoid collisions.
   */
  const randomName = Math.random().toString(36).substring(7);
  const pdfPath = `pdfs/${randomName}.pdf`;
  await writeFile(pdfPath, pdf, 'binary');
  const loader = new UnstructuredLoader(pdfPath, {
    apiKey: process.env.UNSTRUCTURED_API_KEY,
    strategy: 'hi_res',
  });
  const docs = await loader.load();
  /** Delete the temporary PDF file. */
  await unlink(pdfPath);
  return docs;
}

export async function processPaper(
  paperUrl: string,
  name: string,
  pagesToDelete?: number[]
) {
  const database = await SupabaseDatabase.fromExistingIndex();
  try {
    const existingPaper = await database.getPaperFromDatabase(paperUrl);
    if (existingPaper) {
      return existingPaper.notes;
    }
  } catch (_) {
    // no-op
  }
  const pdfBuffer = await loadPdfFromUrl(paperUrl);
  if (pagesToDelete && pagesToDelete.length > 0) {
    await deletePagesFromPdf(pdfBuffer, pagesToDelete);
  }
  const documents = await convertPdfToDocuments(pdfBuffer);
  await database.embedDocuments(documents);
  const notes = await generateNotes(documents);
  await database.addPaperToDatabase({
    paper: formatDocumentsAsString(documents, '\n'),
    url: paperUrl,
    notes,
    name,
  });
  return notes;
}
