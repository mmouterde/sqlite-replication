import { capSQLiteChanges } from '@capacitor-community/sqlite';
import { capSQLiteResult } from '@capacitor-community/sqlite/dist/esm/definitions';
export interface ReplicationStorage {
    createReplicationStatesTable(): Promise<any>;
    getDefinedColumns(collectionName: string): Promise<string[] | null>;
    getReplicationPushState(collectionName: string): Promise<ReplicationState>;
    getReplicationPullState(collectionName: string): Promise<ReplicationState>;
    updateReplicationPushState(collectionName: string, offset: number, cursor: number): Promise<ReplicationState>;
    updateReplicationPullState(collectionName: string, offset: number, cursor: number): Promise<ReplicationState>;
    beginTransaction(): Promise<any>;
    commitTransaction(): Promise<any>;
    rollbackTransaction(): Promise<any>;
    isTransactionActive(): Promise<{
        result: boolean;
    }> | Promise<capSQLiteResult>;
}
export interface ReplicationCollectionOptions {
    name: string;
    batchSize: number;
    upsertAll: (documents: any[]) => Promise<void> | Promise<capSQLiteChanges> | Promise<Changes>;
    deleteAll: (documents: any[]) => Promise<void> | Promise<capSQLiteChanges> | Promise<Changes>;
    findChanges: (state: ReplicationConfig) => Promise<any[]>;
    getDocumentOffset: (updatedAt: number, id: string) => Promise<number>;
}
export interface ReplicationOptions {
    collections: ReplicationCollectionOptions[];
    fetchPull: (pullConfigs: any) => Promise<any>;
    fetchPush: (documentsByCollectionName: any) => Promise<any>;
}
export interface ReplicationState {
    offset: number;
    cursor: number;
}
export interface ReplicationConfig {
    limit: number;
    offset: number;
    cursor: number;
}
export interface PulledCollection {
    hasMoreChanges: number;
    offset: number;
    cursor: number;
    limit: number;
    documents: PulledDocument[];
}
export interface PulledDocument {
    deletedAt: number;
    updatedAt: number;
    id: string;
}
export interface SQLiteConnection {
    query(statements: string): Promise<{
        values?: any[];
    }>;
    execute(statements: string, transaction?: boolean, isSQL92?: boolean): Promise<Changes>;
    beginTransaction(): Promise<Changes>;
    commitTransaction(): Promise<Changes>;
    rollbackTransaction(): Promise<Changes>;
    isTransactionActive(): Promise<{
        result: boolean;
    }> | Promise<capSQLiteResult>;
}
export interface Changes {
    changes?: number;
    lastId?: number;
    values?: any[];
}
