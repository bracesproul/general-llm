import * as fs from 'fs/promises';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { RunnableSequence } from 'langchain/schema/runnable';
import path from 'path';
import { Project, SourceFile } from 'ts-morph';
import { loadFilesFromDirectory } from 'utils/loadFilesFromDirectory.js';
import { z } from 'zod';
import { lintAndFormatFiles, openPullRequest } from 'utils/openPullRequest.js';
import { prettifyCode } from 'utils/prettifyCode.js';
import { initLangChainProject } from 'utils/initLangChainProject.js';
import { removeCommentsFromFile } from 'utils/removeCommentsFromFile.js';
import { WRITE_EXAMPLE_CODE_PROMPT } from './prompts.js';

const LANGCHAIN_GIT_URL = 'https://github.com/langchain-ai/langchainjs.git';
const LANGCHAIN_ABSOLUTE_PATH = '/tmp/langchainjs';
const PULL_REQUEST_BRANCH = `agent/add-example-jsdocs-${Math.random()
  .toString(36)
  .substring(7)}`;
const PULL_REQUEST_TITLE = '[AUTO-GENERATED] Add JSDoc examples to classes.';

type ClassWithoutExample = {
  path: string;
  className: string;
};

/**
 Find all exported classes which do not contain an example in their JSDoc.
 *
 @param {Array<string>} entrypoints A list of paths which are entrypoints for LangChain.
 @returns {Array<ClassWithoutExample>} A list of objects with path and classname.
 */
function getAllClassesWithoutExamples(
  project: Project
): Array<ClassWithoutExample> {
  const sourceFiles = project.getSourceFiles();

  const classesWithoutExamples: Array<ClassWithoutExample> = [];

  sourceFiles.forEach((file) => {
    file.getClasses().forEach((klass) => {
      // Can't add examples to abstract classes.
      if (klass.isAbstract()) {
        return;
      }
      const className = klass.getName();
      // Can't add examples to classes which are
      // not exported, or which don't have names.
      if (!klass.isExported() || !className) {
        return;
      }
      // If the class does not have any JSDocs,
      // we want to add one.
      if (klass.getJsDocs().length === 0) {
        classesWithoutExamples.push({
          path: file.getFilePath(),
          className,
        });
        return;
      }
      // If the class already has an example,
      // we don't want to add another.
      const jsDocHasExample = klass
        .getJsDocs()
        .some((doc) =>
          doc.getTags().some((tag) => tag.getTagName() === 'example')
        );
      if (jsDocHasExample) {
        return;
      }
      // Check for the number of code blocks in
      // the JSDoc. If the JSDoc already has an
      // example, we don't want to add another.
      const jsDocs = klass.getJsDocs();
      if (jsDocs.length! > 0) {
        classesWithoutExamples.push({
          path: file.getFilePath(),
          className,
        });
        return;
      }
      const jsDocContent = jsDocs[0].getInnerText();
      const numCodeBlocks = jsDocContent.split('```').length - 1;
      if (numCodeBlocks >= 2) {
        return;
      }
      classesWithoutExamples.push({
        path: file.getFilePath(),
        className,
      });
    });
  });

  return classesWithoutExamples;
}

async function findExampleFile(
  klass: ClassWithoutExample,
  rootPath: string,
  project: Project
): Promise<string | undefined> {
  // find category, search in category, find files, narrow down.
  // Gets the top level directory, eg: `chat_models`
  const category = klass.path
    .split('/langchainjs/langchain/src/')[1]
    .split('/')[0];
  const categoryToExampleDirMap: Record<
    string,
    string | Array<string> | false
  > = {
    agents: 'agents',
    base_language: false,
    cache: 'cache',
    callbacks: 'callbacks',
    chains: 'chains',
    chat_models: ['models/chat', 'chat'], // TBD
    document_loaders: 'document_loaders',
    document_transformers: 'document_transformers',
    embeddings: ['embeddings', 'models/embeddings'],
    evaluation: 'guides/evaluation',
    experimental: 'experimental',
    graphs: 'graphs',
    llms: ['models/llms', 'llms'],
    load: false,
    memory: 'memory',
    output_parsers: 'output_parsers',
    prompts: 'prompts',
    retrievers: 'retrievers',
    runnables: 'guides/expression_language',
    schema: 'guides/expression_language',
    storage: 'stores',
    stores: 'memory',
    tests: false,
    tools: 'tools',
    types: false,
    utils: false,
    vectorstores: 'vectorstores',
  };
  if (!(category in categoryToExampleDirMap)) {
    return undefined;
  }
  const examplesCategoryDir = categoryToExampleDirMap[category];
  if (examplesCategoryDir === false) {
    return undefined;
  }

  const fullExamplesDir = Array.isArray(examplesCategoryDir)
    ? examplesCategoryDir.map((dir) =>
        path.join(rootPath, 'examples', 'src', dir)
      )
    : path.join(rootPath, 'examples', 'src', examplesCategoryDir);

  const exampleFiles = Array.isArray(fullExamplesDir)
    ? (
        await Promise.all(
          fullExamplesDir.map((dir) => loadFilesFromDirectory(dir))
        )
      ).flat()
    : await loadFilesFromDirectory(fullExamplesDir);

  const filesWhereClassIsImported: Array<string> = [];

  exampleFiles.forEach((file) => {
    let sourceFile: SourceFile;
    try {
      sourceFile = project.addSourceFileAtPath(file);
    } catch (err) {
      // File does not exist.
      console.log(err);
      return;
    }
    const importsInFile = sourceFile.getImportDeclarations();
    // Get all imports in the file.
    const imports = importsInFile.map((imp) => {
      const importedSymbols = imp.getNamedImports();
      const importedSymbolsNames = importedSymbols.map((sym) => sym.getName());
      return {
        importedSymbolsNames,
      };
    });
    const classImported = imports.some((imp) =>
      imp.importedSymbolsNames.includes(klass.className)
    );
    if (!classImported) {
      return;
    }
    filesWhereClassIsImported.push(file);
  });

  if (filesWhereClassIsImported.length === 0) {
    console.warn(`No files found where ${klass.className} is imported.`);
    return undefined;
  }
  if (filesWhereClassIsImported.length === 1) {
    return filesWhereClassIsImported[0];
  }
  const fileWithLeastCode = await getLeastCodeFile(filesWhereClassIsImported);
  return fileWithLeastCode;
}

// if theres more than one, load all and pick one with the least amount of code.
async function getLeastCodeFile(files: Array<string>): Promise<string> {
  const fileContents = await Promise.all(
    files.map(async (file) => {
      const contents = await fs.readFile(file, 'utf-8');
      return {
        file,
        contents,
      };
    })
  );
  fileContents.sort((a, b) => a.contents.length - b.contents.length);
  return fileContents[0].file;
}

const pickRandomModel = (text: string) => {
  const evenOrOdd = Math.random() > 0.5 ? 'even' : 'odd';
  let modelToUse = '';
  if (evenOrOdd === 'even') {
    modelToUse = 'ChatOpenAI';
  } else {
    modelToUse = 'ChatAnthropic';
  }
  // Searches for all model declarations and replaces
  //
  const newText = text.replace(
    /const (model|llm|chat) = new [^\\(]+/g,
    (_, p1) => `const ${p1} = new ${modelToUse}`
  );
  return newText;
};

async function formatCodeForJsDoc(
  text: string,
  klass: string
): Promise<string> {
  const cleanedText = text.replace('```', '');
  // Replaces the LLM model with either ChatOpenAI or
  // ChatAnthropic. (if it is defined as its own variable)
  const textWithRandomModel = pickRandomModel(cleanedText);
  let formattedText = textWithRandomModel;
  // find any double newlines (\n\n) and replace with single newlines (\n)
  formattedText = formattedText.replace(/\n\n/g, '\n');
  try {
    // Runs the code through the prettier formatter.
    formattedText = await prettifyCode(textWithRandomModel);
  } catch (err) {
    const failedClassFile = await fs.readFile('failed-class.txt', 'utf-8');
    await fs.writeFile('failed-class.txt', `${failedClassFile}\n${klass}`);
    console.error(`Error while formatting code for JSDoc. Class: ${klass}`);
  }
  // Removes JSDoc and inline comments from code.
  formattedText = removeCommentsFromFile(formattedText);
  return formattedText.trim();
}

async function addOrUpdateJsDocForClass(
  text: string,
  klass: string,
  klassPath: string,
  project: Project
) {
  const sourceFile = project.addSourceFileAtPath(klassPath);
  const classDeclaration = sourceFile.getClass(klass);
  if (!classDeclaration) {
    throw new Error(`Could not find class ${klass} in file ${klassPath}`);
  }
  const cleanedText = await formatCodeForJsDoc(text, klass);
  if (!cleanedText) {
    console.log('No text found for example.', {
      class: klass,
    });
    return;
  }
  const textAsExample = {
    tagName: 'example',
    text: `\n\`\`\`typescript
${cleanedText}
\`\`\``,
  };
  const jsDocs = classDeclaration.getJsDocs();
  if (jsDocs.length === 0) {
    classDeclaration.addJsDoc({
      tags: [textAsExample],
    });
  } else {
    const jsDoc = jsDocs[0];
    jsDoc.addTag(textAsExample);
  }
  // save code
  try {
    await sourceFile.save();
  } catch (err) {
    throw new Error(
      `Could not save file ${klassPath}: ${JSON.stringify(err, null, 2)}`
    );
  }
}

async function generateAndWriteJsDoc(
  input: { exampleFile: string } & ClassWithoutExample,
  project: Project
): Promise<void> {
  const model = new ChatOpenAI({
    temperature: 0,
    modelName: 'gpt-4-1106-preview',
  }).bind({
    response_format: {
      type: 'json_object',
    },
  });
  const outputParser = new StructuredOutputParser(
    z.object({
      code: z.string(),
    })
  );
  const chain = RunnableSequence.from([
    {
      code: async (i: { filePath: string; klass: string }) => {
        const fileContents = await fs.readFile(i.filePath, 'utf-8');
        // Strip comments as many examples contain comments with 1000's of tokens of text.
        const fileContentsWithoutComments =
          removeCommentsFromFile(fileContents);
        return fileContentsWithoutComments;
      },
      klass: (i: { filePath: string; klass: string }) => i.klass,
    },
    WRITE_EXAMPLE_CODE_PROMPT,
    model,
    outputParser,
    async (i: { code: string }) => {
      await addOrUpdateJsDocForClass(
        i.code,
        input.className,
        input.path,
        project
      );
      return `Added example:\n${i.code} to class ${input.className} in file ${input.path}`;
    },
  ]);
  const response = await chain.invoke({
    filePath: input.exampleFile,
    klass: input.className,
  });
}

async function main() {
  const project = await initLangChainProject(
    LANGCHAIN_ABSOLUTE_PATH,
    LANGCHAIN_GIT_URL
  );
  const classesWithoutExamples = getAllClassesWithoutExamples(project);
  const exampleFiles = (
    await Promise.all(
      classesWithoutExamples.map(async (klass) => {
        const file = await findExampleFile(
          klass,
          LANGCHAIN_ABSOLUTE_PATH,
          project
        );
        // @TODO handle these two cases
        if (!file) return undefined;
        if (!file.startsWith(LANGCHAIN_ABSOLUTE_PATH)) return undefined;
        return {
          ...klass,
          exampleFile: file,
        };
      })
    )
  ).flatMap((file) => (file !== undefined ? [file] : []));
  console.log(
    `\n\nFound ${exampleFiles.length} classes without examples. Starting my work now!\n\n`
  );
  let indxCount = 0;
  try {
    for await (const item of exampleFiles) {
      indxCount += 1;
      if (indxCount === 50) {
        break;
      }
      await generateAndWriteJsDoc(item, project);
      console.log(`Wrote example for ${item.className}\n`);
    }
  } catch (err) {
    console.error('Error while iterating over files to update.');
    throw err;
  }
  await lintAndFormatFiles(LANGCHAIN_ABSOLUTE_PATH);
  await openPullRequest(
    LANGCHAIN_ABSOLUTE_PATH,
    PULL_REQUEST_BRANCH,
    PULL_REQUEST_TITLE
  );
  console.log(
    `\n\nAdded: ${exampleFiles.length} examples to the codebase!\nOpened PR @ branch ${PULL_REQUEST_BRANCH}`
  );
}
main();
