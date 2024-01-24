export class ReplicationSQLiteStorage {
    db;
    constructor(db) {
        this.db = db;
    }
    async getDefinedColumns(collectionName) {
        return ((await this.db.query(`PRAGMA table_info("${collectionName}");`)).values?.map((column) => column.name) || []);
    }
    async getReplicationPushState(collectionName) {
        const state = await this.db.query(`SELECT pushCursor as cursor,pushOffset as offset from _replicationStates where id="${collectionName}"`);
        if (state && state.values && state.values.length) {
            const { cursor, offset } = state.values[0];
            return { cursor, offset };
        }
        else
            return { cursor: 0, offset: 0 };
    }
    async getReplicationPullState(collectionName) {
        const state = await this.db.query(`SELECT pullCursor as cursor,pullOffset as offset from _replicationStates where id="${collectionName}"`);
        if (state && state.values && state.values.length) {
            const { cursor, offset } = state.values[0];
            return { cursor, offset };
        }
        else
            return { cursor: 0, offset: 0 };
    }
    createReplicationStatesTable() {
        return this.db.execute(`
    CREATE TABLE IF NOT EXISTS _replicationStates (
      id TEXT PRIMARY KEY NOT NULL,
      pushCursor INTEGER DEFAULT 0,
      pushOffset INTEGER DEFAULT 0,
      pullCursor INTEGER DEFAULT 0,
      pullOffset INTEGER DEFAULT 0
    );`);
    }
    updateReplicationPushState(collectionName, offset, cursor) {
        return this.db.execute(`UPDATE _replicationStates set "pushOffset"=${offset},"pushCursor"=${cursor} where id="${collectionName}"`);
    }
    updateReplicationPullState(collectionName, offset, cursor) {
        return this.db.execute(`UPDATE _replicationStates set "pullOffset"=${offset},"pullCursor"=${cursor} where id="${collectionName}"`);
    }
}
