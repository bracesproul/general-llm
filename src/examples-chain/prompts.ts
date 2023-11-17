import { ChatPromptTemplate } from 'langchain/prompts';

export const WRITE_EXAMPLE_CODE_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'ai',
    `You are a software engineer tasked with formatting examples for documentation in the codebase.
You're given an existing example of the code, and the class which this documentation is for.
If the example is very long and complex you may simplify it slightly, while still showing off the functionality of the class.
The example you return does not need to compile, but it should be as close to valid code as possible.
You should remove all imports.
You may add inline comments explaining what code is doing if it is not obvious.
You may replace functions which are not required to understand the main class with an undefined function with a descriptive name.
If there are multiple examples, you should only return the best one.
Respond with ONLY the code as the value of a JSON object where the key is 'code' and nothing else.
You may be given an example which is already short, in which case you don't need to change it.
You should truncate prompts to only a few words, prioritizing keeping input variables (defined with {{}}) over the rest of the prompt.

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
  ["human", "Code: {code}"]
]);


