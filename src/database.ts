import { Document } from "langchain/document";
import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import {
  ARXIV_EMBEDDINGS_TABLE,
  ARXIV_PAPERS_TABLE,
  ArxivPapers,
  ArxivNotes,
  ARXIV_QUESTION_ANSWERING_TABLE,
} from "types.js";
import { Database } from "generated.js";

export class SupabaseDatabase {
  vectorStore: SupabaseVectorStore;

  client: SupabaseClient<Database, "public", any>;

  constructor(
    vectorStore: SupabaseVectorStore,
    client: SupabaseClient<Database, "public", any>
  ) {
    this.vectorStore = vectorStore;
    this.client = client;
  }

  static async fromExistingIndex(): Promise<SupabaseDatabase> {
    const privateKey = process.env.SUPABASE_PRIVATE_KEY;
    if (!privateKey) throw new Error(`Missing SUPABASE_PRIVATE_KEY`);

    const url = process.env.SUPABASE_URL;
    if (!url) throw new Error(`Missing SUPABASE_URL`);

    const client = createClient<Database>(url, privateKey);

    const vectorStore = await SupabaseVectorStore.fromExistingIndex(
      new OpenAIEmbeddings(),
      {
        client,
        tableName: ARXIV_EMBEDDINGS_TABLE,
        queryName: "match_documents",
      }
    );

    return new this(vectorStore, client);
  }

  static async fromDocuments(docs: Document[]): Promise<SupabaseDatabase> {
    const privateKey = process.env.SUPABASE_PRIVATE_KEY;
    if (!privateKey) throw new Error(`Missing SUPABASE_PRIVATE_KEY`);

    const url = process.env.SUPABASE_URL;
    if (!url) throw new Error(`Missing SUPABASE_URL`);

    const client = createClient<Database>(url, privateKey);

    const vectorStore = await SupabaseVectorStore.fromDocuments(
      docs,
      new OpenAIEmbeddings(),
      {
        client,
        tableName: ARXIV_EMBEDDINGS_TABLE,
        queryName: "match_documents",
      }
    );

    return new this(vectorStore, client);
  }

  async embedDocuments(docs: Document[]): Promise<void> {
    await this.vectorStore.addDocuments(docs);
  }

  async addPaperToDatabase({
    paper,
    url,
    notes,
    name,
  }: {
    paper: string;
    url: string;
    notes: Array<ArxivNotes>;
    name: string;
  }): Promise<void> {
    await this.client.from(ARXIV_PAPERS_TABLE).insert({
      paper,
      arxiv_url: url,
      notes,
      name,
    });
  }

  async getPaperFromDatabase(url: string): Promise<ArxivPapers> {
    const row = await this.client
      .from(ARXIV_PAPERS_TABLE)
      .select()
      .eq("arxiv_url", url);

    if (row.data && row.data.length > 0) {
      return row.data[0];
    }
    throw new Error(`Error fetching paper with URL: ${url}`);
  }

  async similaritySearch(
    query: string,
    metadata?: Partial<{ filename: string; category: string }>,
    k = 5
  ): Promise<Document[]> {
    const results = await this.vectorStore.similaritySearch(query, k, metadata);
    return results;
  }

  async saveQuestionAnsweringResults({
    question,
    answer,
    followupQuestions,
    context,
  }: {
    question: string;
    answer: string;
    followupQuestions?: string[];
    context: string;
  }): Promise<void> {
    await this.client.from(ARXIV_QUESTION_ANSWERING_TABLE).insert({
      question,
      answer,
      followup_questions: followupQuestions,
      context,
    });
  }
}
