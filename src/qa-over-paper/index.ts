import { SupabaseDatabase } from "database.js";
import { ArxivNotes } from "types.js";
import { Document } from "langchain/document";
import { formatDocumentsAsString } from "langchain/util/document";
import { ChatOpenAI } from "langchain/chat_models/openai";

import { StringOutputParser } from "langchain/schema/output_parser";
import {
  ANSWER_QUESTION_TOOL_SCHEMA,
  QA_OVER_PAPER_PROMPT,
  answerOutputParser,
  getFewShotExampleQARephrasePrompt,
} from "./prompts.js";

async function qaModel({
  question,
  relevantDocuments,
  notes,
}: {
  question: string;
  relevantDocuments: Array<Document>;
  notes: Array<ArxivNotes>;
}) {
  const notesAsString = notes
    .map(
      ({ note, pageNumbers }) =>
        `Note: ${note}, Page number: ${pageNumbers.join(", ")}`
    )
    .join("\n- ");
  const documentsAsString = formatDocumentsAsString(relevantDocuments, "\n");
  const model = new ChatOpenAI({
    modelName: "gpt-4-1106-preview",
    temperature: 0,
  });
  const modelWithTools = model.bind({
    tools: [ANSWER_QUESTION_TOOL_SCHEMA],
    tool_choice: "auto",
  });
  const chain =
    QA_OVER_PAPER_PROMPT.pipe(modelWithTools).pipe(answerOutputParser);
  const [response, fullPrompt] = await Promise.all([
    chain.invoke({
      notes: notesAsString,
      relevantDocuments: documentsAsString,
      question,
    }),
    QA_OVER_PAPER_PROMPT.format({
      notes: notesAsString,
      relevantDocuments: documentsAsString,
      question,
    }),
  ]);
  return {
    response,
    fullPrompt,
  };
}

async function rephraseQuestion(question: string) {
  const prompt = await getFewShotExampleQARephrasePrompt();
  const model = new ChatOpenAI({
    modelName: "gpt-4-1106-preview",
    temperature: 0,
  });
  const chain = prompt.pipe(model).pipe(new StringOutputParser());
  const newQuestion = await chain.invoke({ question });
  return newQuestion;
}

export async function qaOverPaper(question: string, name: string, url: string) {
  const fileName = name.replace(/\W+/g, "_");
  const database = await SupabaseDatabase.fromExistingIndex();
  const allSimilarDocuments = await Promise.all([
    database.similaritySearch(question, {
      filename: fileName,
      category: "NarrativeText",
    }),
    database.similaritySearch(question, {
      filename: fileName,
    }),
  ]);
  const flatDocs = allSimilarDocuments.flat();
  const uniqueDocuments = Array.from(
    flatDocs
      .reduce((map, doc) => map.set(doc.pageContent, doc), new Map())
      .values()
  );
  const paper = await database.getPaperFromDatabase(url);
  const { notes } = paper;
  const rephrasedQuestion = await rephraseQuestion(question);
  const { response, fullPrompt } = await qaModel({
    question: rephrasedQuestion,
    relevantDocuments: uniqueDocuments,
    notes: notes as Array<ArxivNotes>,
  });
  await database.saveQuestionAnsweringResults({
    question,
    answer: response.map(({ answer }) => answer).join("\n"),
    followupQuestions: response
      .map(({ followupQuestions }) => followupQuestions)
      .flat(),
    context: fullPrompt,
  });
  return response;
}
