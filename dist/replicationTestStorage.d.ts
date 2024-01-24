import { ReplicationState, ReplicationStorage } from './replication';
export declare class ReplicationTestStorage implements ReplicationStorage {
    private replicationPullState;
    private replicationPushState;
    private updateReplicationPushStateFn;
    private updateReplicationPullStateFn;
    constructor(replicationPullState: any, replicationPushState: any, updateReplicationPushStateFn?: (collectionName: string, offset: number, cursor: number) => Promise<any>, updateReplicationPullStateFn?: (collectionName: string, offset: number, cursor: number) => Promise<any>);
    getDefinedColumns(collectionName: string): Promise<null>;
    getReplicationPullState(collectionName: string): Promise<ReplicationState>;
    getReplicationPushState(collectionName: string): Promise<ReplicationState>;
    createReplicationStatesTable(): Promise<void>;
    updateReplicationPushState(collectionName: string, offset: number, cursor: number): Promise<any>;
    updateReplicationPullState(collectionName: string, offset: number, cursor: number): Promise<any>;
    beginTransaction(): Promise<void>;
    commitTransaction(): Promise<void>;
    isTransactionActive(): Promise<{
        result: boolean;
    }>;
    rollbackTransaction(): Promise<void>;
}
