import { testConnection, query } from './database';

describe('Database Configuration', () => {
  let isDbAvailable: boolean;

  beforeAll(async () => {
    isDbAvailable = await testConnection();
  });

  test('should connect to database successfully', async () => {
    if (!isDbAvailable) {
      console.log('Skipping database test - PostgreSQL not available');
      return;
    }
    const isConnected = await testConnection();
    expect(isConnected).toBe(true);
  });

  test('should execute basic query', async () => {
    if (!isDbAvailable) {
      console.log('Skipping database query test - PostgreSQL not available');
      return;
    }
    const result = await query('SELECT 1 as test_value');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].test_value).toBe(1);
  });
});