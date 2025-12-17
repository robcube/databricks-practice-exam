// Test setup file for Jest
import { pool } from '../config/database';

let dbConnected = false;

// Setup before all tests
beforeAll(async () => {
  // Test database connection
  try {
    const client = await pool.connect();
    client.release();
    dbConnected = true;
    console.log('Test database connection successful');
  } catch (error) {
    console.log('Test database connection failed - tests will skip database operations');
    dbConnected = false;
  }
});

// Cleanup after all tests
afterAll(async () => {
  if (dbConnected) {
    await pool.end();
  }
});

export { dbConnected };