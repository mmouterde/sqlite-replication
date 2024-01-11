import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { ReplicationState, ReplicationStorage } from './replication';
export declare class ReplicationSQLiteStorage implements ReplicationStorage {
    private db;
    constructor(db: SQLiteDBConnection);
    getDefinedColumns(collectionName: string): Promise<any[]>;
    getReplicationState(collectionName: string): Promise<ReplicationState>;
    createReplicationStatesTable(): Promise<import("@capacitor-community/sqlite").capSQLiteChanges>;
    updateReplicationState(collectionName: string, offset: number, cursor: number): Promise<any>;
}
