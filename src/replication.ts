import { capSQLiteChanges } from '@capacitor-community/sqlite';

export interface ReplicationStorage {
    createReplicationStatesTable(): Promise<any>;
    getDefinedColumns(collectionName: string): Promise<string[] | null>;
    getReplicationState(collectionName: string): Promise<ReplicationState>;
    updateReplicationState(collectionName: string, offset: number, cursor: number): Promise<ReplicationState>;
}
export interface ReplicationCollectionOptions {
    name: string;
    batchSize: number;
    upsertAll: (documents: any[]) => Promise<void> | Promise<capSQLiteChanges>;
    deleteAll: (documents: any[]) => Promise<void> | Promise<capSQLiteChanges>;
    countDocumentsUpdatedAt: (updatedAt: number) => Promise<number>;
}
export interface ReplicationOptions {
    collections: ReplicationCollectionOptions[];
    fetchPull: (pullConfigs: any) => Promise<any>;
    fetchPush: () => Promise<any>;
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
