export function removeCommentsFromFile(text: string): string {
  const jsDocRegex = /\/\*\*[\s\S]*?\*\/|\/\*[\s\S]*?\*\//g;
  const textWithoutComments = text.replace(/\/\/.*/g, '');
  return textWithoutComments.replace(jsDocRegex, '');
}
