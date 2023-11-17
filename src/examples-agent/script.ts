import { initLangChainProject } from 'utils/initLangChainProject.js';
import { prettifyCode } from 'utils/prettifyCode.js';

const LANGCHAIN_GIT_URL = 'https://github.com/langchain-ai/langchainjs.git';
const LANGCHAIN_ABSOLUTE_PATH = '/tmp/langchainjs';

const filesWithCommentsToParse = [
  'src/cache/ioredis.ts',
  'src/cache/redis.ts',
  'src/callbacks/manager.ts',
  'src/chains/analyze_documents_chain.ts',
  'src/chains/conversation.ts',
  'src/chains/openai_moderation.ts',
  'src/chains/sequential_chain.ts',
  'src/chat_models/anthropic.ts',
  'src/chat_models/baiduwenxin.ts',
  'src/chat_models/cloudflare_workersai.ts',
  'src/chat_models/fake.ts',
  'src/chat_models/fireworks.ts',
  'src/chat_models/googlepalm.ts',
  'src/chat_models/yandex.ts',
  'src/document_transformers/html_to_text.ts',
  'src/document_transformers/mozilla_readability.ts',
  'src/embeddings/bedrock.ts',
  'src/embeddings/googlepalm.ts',
  'src/embeddings/googlevertexai.ts',
  'src/embeddings/hf_transformers.ts',
  'src/embeddings/minimax.ts',
  'src/embeddings/tensorflow.ts',
  'src/llms/cohere.ts',
  'src/llms/hf.ts',
  'src/llms/ollama.ts',
  'src/llms/openai-chat.ts',
  'src/llms/openai.ts',
  'src/llms/portkey.ts',
  'src/llms/replicate.ts',
  'src/memory/buffer_token_memory.ts',
  'src/memory/buffer_window_memory.ts',
];

async function prettifyExampleCode() {
  const project = await initLangChainProject(
    LANGCHAIN_ABSOLUTE_PATH,
    LANGCHAIN_GIT_URL
  );

  // Loop through each file and find the exported class
  // get the jsdoc on that class
  const files = project.getSourceFiles();
  const filesToParse = files.filter((file) => {
    const splitted = file.getFilePath().split('langchain/')[1];
    return filesWithCommentsToParse.includes(splitted);
  });
  console.log('filesToParse', filesToParse.length);
  await Promise.all(
    filesToParse.map(async (file) => {
      const classes = file.getClasses();
      await Promise.all(
        classes.map(async (classDec) => {
          const jsDocs = classDec.getJsDocs();
          await Promise.all(
            jsDocs.map(async (jsDoc) => {
              const innerText = jsDoc.getInnerText();
              const firstSplit = innerText.split('```typescript');
              if (!firstSplit.length || !firstSplit[1]) {
                return;
              }
              const firstSplitOne = firstSplit[1];
              const secondSplit = firstSplitOne.split('```');
              if (!secondSplit.length || !secondSplit[0]) {
                return;
              }
              const code = secondSplit[0];
              console.log('\n\n', code);
              const prettifiedCode = await prettifyCode(code);
              const newComment = innerText.replace(code, prettifiedCode);
              classDec.addJsDoc({
                description: newComment,
              });
            })
          );
        })
      );
      file.save();
    })
  );
}
prettifyExampleCode();
