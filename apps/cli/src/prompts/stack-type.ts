import * as p from '@clack/prompts';
import { StackType } from '@blueprintdata/models';

export const promptStackType = async (): Promise<StackType> => {
  const stackType = (await p.select({
    message: 'Select a stack type',
    options: [
      { value: 'lite-bigquery', label: 'Lite Data Stack (BigQuery)' },
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
