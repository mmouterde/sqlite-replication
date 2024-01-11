import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { ReplicationCollectionOptions, ReplicationConfig, ReplicationOptions, ReplicationStorage } from './replication';
export declare function getDefaultCollectionOptions(db: SQLiteDBConnection, collectionName: string, options?: {
    batchSize?: number;
    map?: (document: any) => any;
}): ReplicationCollectionOptions;
export declare function safeValue(value: any): any;
export declare function ensureRequiredColumns(db: ReplicationStorage, collections: ReplicationCollectionOptions[]): Promise<void>;
export declare function ensureFetchPull(config: ReplicationOptions): void;
export declare function ensureFetchPush(config: ReplicationOptions): void;
export declare function getReplicationState(db: ReplicationStorage, collection: ReplicationCollectionOptions): Promise<ReplicationConfig>;
