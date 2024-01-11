import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { ReplicationCollectionOptions, ReplicationConfig, ReplicationOptions, ReplicationStorage } from './replication';
export declare class ReplicationHelpers {
    static getDefaultCollectionOptions(db: SQLiteDBConnection, collectionName: string, options?: {
        batchSize?: number;
        map?: (document: any) => any;
    }): ReplicationCollectionOptions;
    static safeValue(value: any): any;
    static ensureRequiredColumns(db: ReplicationStorage, collections: ReplicationCollectionOptions[]): Promise<void>;
    static ensureFetchPull(config: ReplicationOptions): void;
    static ensureFetchPush(config: ReplicationOptions): void;
    static getReplicationState(db: ReplicationStorage, collection: ReplicationCollectionOptions): Promise<ReplicationConfig>;
}
