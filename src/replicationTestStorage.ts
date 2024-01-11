import {ReplicationState, ReplicationStorage} from "./replication";

export class ReplicationTestStorage implements ReplicationStorage {
    constructor(private replicationState: any) {}

    async getDefinedColumns(collectionName: string) {
        return Promise.resolve(null);
    }
    async getReplicationState(collectionName: string): Promise<ReplicationState> {
        return this.replicationState[collectionName];
    }
    createReplicationStatesTable() {
        return Promise.resolve();
    }
    updateReplicationState(collectionName: string, offset: number, cursor: number): Promise<any> {
        return Promise.resolve();
    }
}
