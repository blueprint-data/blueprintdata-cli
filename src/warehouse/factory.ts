import { WarehouseConnection } from '../types.js';
import { BaseWarehouseConnector } from './connection.js';

/**
 * Factory function to create warehouse connector based on connection type
 *
 * @param connection - Warehouse connection configuration
 * @returns Promise resolving to appropriate warehouse connector instance
 * @throws Error if warehouse type is unsupported
 *
 * @example
 * ```typescript
 * const connection: WarehouseConnection = {
 *   type: 'postgres',
 *   host: 'localhost',
 *   port: 5432,
 *   database: 'mydb',
 * };
 * const connector = await createWarehouseConnector(connection);
 * ```
 */
export const createWarehouseConnector = async (
  connection: WarehouseConnection
): Promise<BaseWarehouseConnector> => {
  if (connection.type === 'bigquery') {
    const { BigQueryConnector } = await import('./bigquery.js');
    return new BigQueryConnector(connection);
  } else if (connection.type === 'postgres') {
    const { PostgresConnector } = await import('./postgres.js');
    return new PostgresConnector(connection);
  } else {
    throw new Error(`Unsupported warehouse type: ${connection.type}`);
  }
};
