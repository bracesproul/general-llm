import { ConversationChain } from 'langchain/chains';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { BufferMemory } from 'langchain/memory';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  HumanMessagePromptTemplate,
} from 'langchain/prompts';

async function retrievalQAQuery(payload: any) {
  // const query ='What is the capital of USA?';
  const llmModel = new ChatOpenAI({
    temperature: 0,
    // azureOpenAIApiKey: XXXX,
    // azureOpenAIApiInstanceName: XXXX,
    // azureOpenAIApiVersion: XXXXX,
    // azureOpenAIApiDeploymentName: XXX,
    streaming: true,
    verbose: false,
  });

  const prompts = ChatPromptTemplate.fromMessages([
    ['system', 'Demo Prompt from User'],
  ]);
  prompts.promptMessages.push(
    new MessagesPlaceholder('chat_history'),
    HumanMessagePromptTemplate.fromTemplate(`{question}`)
  );

  const memory = new BufferMemory({
    memoryKey: 'chat_history',
    returnMessages: true,
    inputKey: 'question',
  });

  const chain = new ConversationChain({
    memory,
    prompt: prompts,
    llm: llmModel,
  });
  let response = '';
  try {
    const resp = await chain.call({
      question: payload.query,
      chat_history: (await memory.loadMemoryVariables({})).chat_history,
    }, [
      {
        handleLLMNewToken(token: string, idx, runId, parentRunId) {
          response += token;
        },
      },
    ],);
  } catch (error: any) {
    console.error(
      `Error while responding to Query: ${payload.query}: Details :${error}`
    );
  }
  console.log(response);
}
retrievalQAQuery({ query: 'What is the capital of USA?' });
