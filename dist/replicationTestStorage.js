export class ReplicationTestStorage {
    replicationPullState;
    replicationPushState;
    updateReplicationPushStateFn;
    updateReplicationPullStateFn;
    constructor(replicationPullState, replicationPushState, updateReplicationPushStateFn = () => Promise.resolve(), updateReplicationPullStateFn = () => Promise.resolve()) {
        this.replicationPullState = replicationPullState;
        this.replicationPushState = replicationPushState;
        this.updateReplicationPushStateFn = updateReplicationPushStateFn;
        this.updateReplicationPullStateFn = updateReplicationPullStateFn;
    }
    async getDefinedColumns(collectionName) {
        return Promise.resolve(null);
    }
    async getReplicationPullState(collectionName) {
        return this.replicationPullState[collectionName];
    }
    async getReplicationPushState(collectionName) {
        return this.replicationPushState[collectionName];
    }
    createReplicationStatesTable() {
        return Promise.resolve();
    }
    updateReplicationPushState(collectionName, offset, cursor) {
        return this.updateReplicationPushStateFn
            ? this.updateReplicationPushStateFn(collectionName, offset, cursor)
            : Promise.resolve();
    }
    updateReplicationPullState(collectionName, offset, cursor) {
        return this.updateReplicationPullStateFn
            ? this.updateReplicationPullStateFn(collectionName, offset, cursor)
            : Promise.resolve();
    }
    beginTransaction() {
        return Promise.resolve();
    }
    commitTransaction() {
        return Promise.resolve();
    }
    isTransactionActive() {
        return Promise.resolve();
    }
    rollbackTransaction() {
        return Promise.resolve();
    }
}
