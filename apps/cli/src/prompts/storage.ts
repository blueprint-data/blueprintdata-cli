import * as p from '@clack/prompts';
import { StorageType } from '@blueprintdata/models';

export const promptStorage = async (): Promise<StorageType> => {
  const storageType = (await p.select({
    message: 'Select storage type',
    options: [
      { value: 'postgres', label: 'PostgreSQL' },
      { value: 'bigquery', label: 'BigQuery' },
    ],
  })) as StorageType;

  if (p.isCancel(storageType)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }

  return storageType;
};
