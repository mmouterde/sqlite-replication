import { ReplicationState, ReplicationStorage } from './replication';

export class ReplicationTestStorage implements ReplicationStorage {
    constructor(
        private replicationPullState: any,
        private replicationPushState: any,
    ) {}

    async getDefinedColumns(collectionName: string) {
        return Promise.resolve(null);
    }
    async getReplicationPullState(collectionName: string): Promise<ReplicationState> {
        return this.replicationPullState[collectionName];
    }
    async getReplicationPushState(collectionName: string): Promise<ReplicationState> {
        return this.replicationPushState[collectionName];
    }
    createReplicationStatesTable() {
        return Promise.resolve();
    }
    updateReplicationPushState(collectionName: string, offset: number, cursor: number): Promise<any> {
        return Promise.resolve();
    }
    updateReplicationPullState(collectionName: string, offset: number, cursor: number): Promise<any> {
        return Promise.resolve();
    }
}
