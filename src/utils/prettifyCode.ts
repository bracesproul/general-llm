import prettier from 'prettier';

export async function prettifyCode(code: string): Promise<string> {
  return prettier.format(code, {
    parser: 'typescript',
  });
}
