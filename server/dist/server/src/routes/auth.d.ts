import express, { Request, Response, NextFunction } from 'express';
import { User as UserModel } from '../models/User';
declare const router: import("express-serve-static-core").Router;
declare const users: Map<string, UserModel>;
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => express.Response<any, Record<string, any>> | undefined;
export { users };
export default router;
//# sourceMappingURL=auth.d.ts.map