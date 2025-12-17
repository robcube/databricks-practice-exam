import { Pool } from 'pg';
export declare const pool: Pool;
export declare const testConnection: () => Promise<boolean>;
export declare const closePool: () => Promise<void>;
export declare const query: (text: string, params?: any[]) => Promise<any>;
//# sourceMappingURL=database.d.ts.map