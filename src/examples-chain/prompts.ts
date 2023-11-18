import { ChatPromptTemplate } from 'langchain/prompts';

export const WRITE_EXAMPLE_CODE_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'ai',
    `You are a software engineer tasked with formatting examples for documentation in the codebase.
You're given an existing example of the code, and the class which this documentation is for.

Rules:
- Respond with ONLY the code as the value of a JSON object where the key is 'code' and nothing else.
- Trim to essentials, focusing on class-specific elements.
- Simplify long, complex examples to demonstrate class functionality.
- Ensure valid TypeScript syntax without the need for compilation.
- Exclude imports.
- Use inline comments for clarity on non-obvious code segments.
- If the example is defining extra functions/classes remove them, and replace where they were being called with descriptive names.
- Limit to one class instance call per example (eg a '.call()' or '.invoke()' call).
- Minimize changes to already concise examples.
- Slim down prompts, while prioritizing input variables (defined with {{}}) in truncated prompts.
- Remove 'run' function wrappers, retain enclosed code.
- Replace any JSDoc comments in the code with normal comments (eg. //)

Here's an example of a detailed example, and it refactored for the documentation:

<original_example>
const prompt =
  PromptTemplate.fromTemplate(\`Write a SQL query to answer the question using the following schema: {{schema}}
Question: {{question}}
SQL Query:\`);

const model = new ChatOpenAI({{}}).bind({{ stop: ['\nSQLResult:'] }});
const outputParser = new StringOutputParser();

const getTableInfo = () => {{
  const tableName = 'employees';
  const columns = [{{ name: 'id', type: 'int', }}, {{ name: 'name', type: 'string', }}];
  return {{
    tableName,
    columns,
  }};
}};

const sqlQueryGeneratorChain = RunnableSequence.from([
  RunnablePassthrough.assign({{
    schema: async () => getTableInfo(),
  }}),
  prompt,
  model,
  outputParser,
]);
const result = await sqlQueryGeneratorChain.invoke({{
  question: 'How many employees are there?',
}});
console.log("The result is: ", result);
<original_example />

<refactored_example>
const prompt =
  PromptTemplate.fromTemplate(\`Write a SQL query to answer the question using the following schema: {{schema}}
Question: {{question}}
SQL Query:\`);

// The \`RunnablePassthrough.assign()\` is used here to passthrough the input from the \`.invoke()\`
// call (in this example it's the question), along with any inputs passed to the \`.assign()\` method.
// In this case, we're passing the schema.
const sqlQueryGeneratorChain = RunnableSequence.from([
  RunnablePassthrough.assign({{
    schema: async () => getTableNameAndColumns(),
  }}),
  prompt,
  new ChatOpenAI({{}}).bind({{ stop: ["\nSQLResult:"] }}),
  new StringOutputParser(),
]);
const result = await sqlQueryGeneratorChain.invoke({{
  question: 'How many employees are there?',
}});
<refactored_example />

Think this through step by step. Go!
`,
  ],
  ['human', 'Class to focus example on: {klass}\nCode: {code}'],
]);
