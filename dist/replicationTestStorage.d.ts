import { ReplicationState, ReplicationStorage } from "./replication";
export declare class ReplicationTestStorage implements ReplicationStorage {
    private replicationState;
    constructor(replicationState: any);
    getDefinedColumns(collectionName: string): Promise<null>;
    getReplicationState(collectionName: string): Promise<ReplicationState>;
    createReplicationStatesTable(): Promise<void>;
    updateReplicationState(collectionName: string, offset: number, cursor: number): Promise<any>;
}
