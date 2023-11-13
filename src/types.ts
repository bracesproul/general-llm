import { Database } from "generated.js";

export type ArxivNotes = {
  note: string;
  pageNumbers: Array<number>;
};

export type ArxivPapers = Database["public"]["Tables"]["arxiv_papers"]["Row"];

export type ArxivEmbeddings =
  Database["public"]["Tables"]["arxiv_embeddings"]["Row"];

export const ARXIV_PAPERS_TABLE = "arxiv_papers";
export const ARXIV_EMBEDDINGS_TABLE = "arxiv_embeddings";
export const ARXIV_QUESTION_ANSWERING_TABLE = "arxiv_question_answering";
