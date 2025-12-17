"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbConnected = void 0;
// Test setup file for Jest
const database_1 = require("../config/database");
let dbConnected = false;
exports.dbConnected = dbConnected;
// Setup before all tests
beforeAll(async () => {
    // Test database connection
    try {
        const client = await database_1.pool.connect();
        client.release();
        exports.dbConnected = dbConnected = true;
        console.log('Test database connection successful');
    }
    catch (error) {
        console.log('Test database connection failed - tests will skip database operations');
        exports.dbConnected = dbConnected = false;
    }
});
// Cleanup after all tests
afterAll(async () => {
    if (dbConnected) {
        await database_1.pool.end();
    }
});
//# sourceMappingURL=setup.js.map