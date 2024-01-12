import { ReplicationState, ReplicationStorage } from './replication';

export class ReplicationTestStorage implements ReplicationStorage {
    constructor(
        private replicationPullState: any,
        private replicationPushState: any,
        private updateReplicationPushStateFn: (
            collectionName: string,
            offset: number,
            cursor: number,
        ) => Promise<any> = () => Promise.resolve(),
        private updateReplicationPullStateFn: (
            collectionName: string,
            offset: number,
            cursor: number,
        ) => Promise<any> = () => Promise.resolve(),
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
        return this.updateReplicationPushStateFn
            ? this.updateReplicationPushStateFn(collectionName, offset, cursor)
            : Promise.resolve();
    }
    updateReplicationPullState(collectionName: string, offset: number, cursor: number): Promise<any> {
        return this.updateReplicationPullStateFn
            ? this.updateReplicationPullStateFn(collectionName, offset, cursor)
            : Promise.resolve();
    }
}
