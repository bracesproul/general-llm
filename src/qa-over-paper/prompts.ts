import type { OpenAI as OpenAIClient } from "openai";
import {
  ChatPromptTemplate,
  FewShotChatMessagePromptTemplate,
} from "langchain/prompts";
import { BaseMessageChunk } from "langchain/schema";

export const QA_OVER_PAPER_PROMPT = ChatPromptTemplate.fromMessages([
  [
    "ai",
    `You are a tenured professor of computer science helping a student with their research.
The student has a question regarding a paper they are reading.
Here are their notes on the paper:
{notes}

And here are some relevant parts of the paper relating to their question
{relevantDocuments}

Answer the student's question in the context of the paper. You should also suggest followup questions.
Take a deep breath, and think through your reply carefully, step by step.`,
  ],
  ["human", "Question: {question}"],
]);

export const ANSWER_QUESTION_TOOL_SCHEMA: OpenAIClient.ChatCompletionTool = {
  type: "function",
  function: {
    name: "questionAnswer",
    description: "The answer to the question",
    parameters: {
      type: "object",
      properties: {
        answer: {
          type: "string",
          description: "The answer to the question",
        },
        followupQuestions: {
          type: "array",
          items: {
            type: "string",
            description: "Followup questions the student should also ask",
          },
        },
      },
      required: ["answer", "followupQuestions"],
    },
  },
};

export const answerOutputParser = (
  output: BaseMessageChunk
): Array<{ answer: string; followupQuestions: string[] }> => {
  const toolCalls = output.additional_kwargs.tool_calls;
  if (!toolCalls) {
    throw new Error("Missing 'tool_calls' in notes output");
  }
  const response = toolCalls
    .map((call) => {
      const args = JSON.parse(call.function.arguments);
      return args;
    })
    .flat();
  return response;
};

export const getFewShotExampleQARephrasePrompt =
  async (): Promise<ChatPromptTemplate> => {
    const examples = [
      {
        input: "How can I make the LLM smarter?",
        output:
          "How does the following paper describe ways to make LLMs more intelligent?",
      },
      {
        input: "Are the models fast?",
        output: "How does the model manage performance and is it fast?",
      },
    ];
    const examplePrompt = ChatPromptTemplate.fromMessages([
      ["human", "{input}"],
      ["ai", "{output}"],
    ]);
    const fewShotPrompt = new FewShotChatMessagePromptTemplate({
      examplePrompt,
      examples,
      inputVariables: [], // no input variables
    });
    const formattedFewShotPrompt = await fewShotPrompt.format({});
    const prompt = ChatPromptTemplate.fromMessages([
      [
        "ai",
        `Using the following examples rephrase the question into a more general and open ended question.
The user will always be asking a question about a specific paper, or content within a paper.
Only respond with the rephrased question and no extra text.`,
      ],
      formattedFewShotPrompt,
      ["human", "{question}"],
    ]);
    return prompt;
  };
