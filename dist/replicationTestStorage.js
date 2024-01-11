export class ReplicationTestStorage {
    replicationState;
    constructor(replicationState) {
        this.replicationState = replicationState;
    }
    async getDefinedColumns(collectionName) {
        return Promise.resolve(null);
    }
    async getReplicationState(collectionName) {
        return this.replicationState[collectionName];
    }
    createReplicationStatesTable() {
        return Promise.resolve();
    }
    updateReplicationState(collectionName, offset, cursor) {
        return Promise.resolve();
    }
}
