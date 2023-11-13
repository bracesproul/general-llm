import { createWriteStream } from "fs";
import axios from "axios";
import { Document } from "langchain/document";
import { UnstructuredLoader } from "langchain/document_loaders/fs/unstructured";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { formatDocumentsAsString } from "langchain/util/document";
import {
  NOTE_PROMPT,
  NOTES_TOOL_SCHEMA,
  notesOutputParser,
} from "./prompts.js";
import { ArxivNotes } from "../types.js";
import { SupabaseDatabase } from "../database.js";
import { modifyPdf } from "./utils.js";

/**
 * Download a PDF from a URL and return the path to the downloaded file.
 * PDFs are always saved in the `/pdfs` directory.
 *
 * @param {string} url The URL to the PDF to download.
 * @param {string} filePath The path to the PDF file to save. Optional, defaults to the name of the PDF in the URL. @example `https://arxiv.org/pdf/2305.15334.pdf` will be saved at `pdfs/2305.15334.pdf`.
 * @returns {Promise<string>} The path to the PDF file
 */
async function loadPdfFromUrl(url: string, filePath?: string): Promise<string> {
  try {
    const response = await axios({
      method: "get",
      url,
      responseType: "stream",
    });

    let fileName = filePath || url.split("/").pop();
    fileName = fileName?.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
    fileName = fileName?.startsWith("pdfs/") ? fileName : `pdfs/${fileName}`;
    if (!filePath) {
      throw new Error(
        `Error getting file path. URL: ${url}, File path: ${filePath}`
      );
    }
    const writer = response.data.pipe(createWriteStream(fileName));

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
    return fileName;
  } catch (error: any) {
    if (
      "message" in error &&
      error.message.startsWith("Error getting file path. URL: ")
    ) {
      throw error;
    }
    // handle error.
    console.error("Error downloading PDF from URL: ", error);
  }
  throw new Error("Error downloading PDF from URL");
}

async function generateNotes(
  documents: Array<Document>
): Promise<Array<ArxivNotes>> {
  const documentsAsString = formatDocumentsAsString(documents, "\n");
  const model = new ChatOpenAI({
    modelName: "gpt-4-1106-preview",
    temperature: 0,
  });
  const modelWithTools = model.bind({
    tools: [NOTES_TOOL_SCHEMA],
    tool_choice: "auto",
  });
  const chain = NOTE_PROMPT.pipe(modelWithTools).pipe(notesOutputParser);
  const response = await chain.invoke({
    paper: documentsAsString,
  });
  return response;
}

async function convertPdfToDocuments(
  pdfPath: string
): Promise<Array<Document>> {
  if (!process.env.UNSTRUCTURED_API_KEY) {
    throw new Error("Missing UNSTRUCTURED_API_KEY");
  }
  const loader = new UnstructuredLoader(pdfPath, {
    apiKey: process.env.UNSTRUCTURED_API_KEY,
    strategy: "hi_res",
  });
  const docs = await loader.load();
  return docs;
}

export async function processPaper(paperUrl: string, name: string) {
  const database = await SupabaseDatabase.fromExistingIndex();
  try {
    const existingPaper = await database.getPaperFromDatabase(paperUrl);
    if (existingPaper) {
      return existingPaper.notes;
    }
  } catch (_) {
    // no-op
  }
  const fileName = name.replace(/\W+/g, "_");
  const pdfPath = await loadPdfFromUrl(paperUrl, fileName);
  await modifyPdf(pdfPath);
  const documents = await convertPdfToDocuments(pdfPath);
  await database.embedDocuments(documents);
  const notes = await generateNotes(documents);
  await database.addPaperToDatabase({
    paper: formatDocumentsAsString(documents, "\n"),
    url: paperUrl,
    notes,
    name,
  });
  return notes;
}
