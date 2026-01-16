import * as p from '@clack/prompts';
import { StackType } from '../types.js';

export const promptStackType = async (): Promise<StackType> => {
  const stackType = (await p.select({
    message: 'Select a stack type',
    options: [
      { value: 'lite', label: 'Lite Data Stack' },
      { value: 'lite-postgres', label: 'Lite Data Stack (Postgres)' },
      { value: 'aws', label: 'AWS Data Stack (Coming soon)' },
    ],
  })) as StackType;

  if (p.isCancel(stackType)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }

  return stackType;
};
