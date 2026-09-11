import pg from 'pg';
declare let pool: pg.Pool | null;
export declare function getPool(): pg.Pool;
export declare function query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params?: any[]): Promise<pg.QueryResult<T>>;
export declare function getClient(): Promise<pg.PoolClient>;
export declare function withTransaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T>;
export declare function closePool(): Promise<void>;
export declare function isPoolHealthy(): boolean;
export { pool, pg };
//# sourceMappingURL=pool.d.ts.map