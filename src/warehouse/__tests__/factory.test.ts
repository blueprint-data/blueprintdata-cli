import { describe, it, expect } from 'bun:test';
import { createWarehouseConnector } from '../factory.js';
import { PostgresConnector } from '../postgres.js';
import { BigQueryConnector } from '../bigquery.js';
import { createMockPostgresConnection, createMockBigQueryConnection } from '../../__tests__/factories/warehouse.factory.js';

describe('Warehouse Factory', () => {
  describe('createWarehouseConnector', () => {
    it('should create PostgresConnector for postgres connection', async () => {
      const connection = createMockPostgresConnection();

      const connector = await createWarehouseConnector(connection);

      expect(connector).toBeInstanceOf(PostgresConnector);
    });

    it('should create BigQueryConnector for bigquery connection', async () => {
      const connection = createMockBigQueryConnection();

      const connector = await createWarehouseConnector(connection);

      expect(connector).toBeInstanceOf(BigQueryConnector);
    });

    it('should throw error for unsupported warehouse type', async () => {
      const connection = { type: 'unsupported' } as any;

      await expect(createWarehouseConnector(connection)).rejects.toThrow('Unsupported warehouse type');
    });
  });
});
