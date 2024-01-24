import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { ReplicationState, ReplicationStorage, SQLiteConnection } from './replication';
export declare class ReplicationSQLiteStorage implements ReplicationStorage {
    private db;
    constructor(db: SQLiteDBConnection | SQLiteConnection);
    getDefinedColumns(collectionName: string): Promise<any[]>;
    getReplicationPushState(collectionName: string): Promise<ReplicationState>;
    getReplicationPullState(collectionName: string): Promise<ReplicationState>;
    createReplicationStatesTable(): Promise<import("@capacitor-community/sqlite").capSQLiteChanges> | Promise<import("./replication").Changes>;
    beginTransaction(): Promise<import("@capacitor-community/sqlite").capSQLiteChanges> | Promise<import("./replication").Changes>;
    commitTransaction(): Promise<import("@capacitor-community/sqlite").capSQLiteChanges> | Promise<import("./replication").Changes>;
    rollbackTransaction(): Promise<import("@capacitor-community/sqlite").capSQLiteChanges> | Promise<import("./replication").Changes>;
    isTransactionActive(): Promise<import("@capacitor-community/sqlite").capSQLiteResult> | Promise<import("./replication").Changes>;
    updateReplicationPushState(collectionName: string, offset: number, cursor: number): Promise<any>;
    updateReplicationPullState(collectionName: string, offset: number, cursor: number): Promise<any>;
}
