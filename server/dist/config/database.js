"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = exports.closePool = exports.testConnection = exports.pool = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const poolConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'databricks_practice_exam',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
    max: 20, // maximum number of clients in the pool
    idleTimeoutMillis: 30000, // how long a client is allowed to remain idle
    connectionTimeoutMillis: 2000, // how long to wait for a connection
};
exports.pool = new pg_1.Pool(poolConfig);
// Test database connection
const testConnection = async () => {
    try {
        const client = await exports.pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('Database connection successful');
        return true;
    }
    catch (error) {
        console.error('Database connection failed:', error);
        return false;
    }
};
exports.testConnection = testConnection;
// Graceful shutdown
const closePool = async () => {
    await exports.pool.end();
    console.log('Database pool closed');
};
exports.closePool = closePool;
// Query helper function
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await exports.pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: res.rowCount });
        return res;
    }
    catch (error) {
        console.error('Query error:', error);
        throw error;
    }
};
exports.query = query;
//# sourceMappingURL=database.js.map