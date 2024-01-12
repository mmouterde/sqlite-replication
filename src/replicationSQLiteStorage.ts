import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { ReplicationState, ReplicationStorage, SQLiteConnection } from './replication';

export class ReplicationSQLiteStorage implements ReplicationStorage {
    constructor(private db: SQLiteDBConnection | SQLiteConnection) {}

    async getDefinedColumns(collectionName: string) {
        return (
            (await this.db.query(`PRAGMA table_info("${collectionName}");`)).values?.map((column) => column.name) || []
        );
    }
    async getReplicationPushState(collectionName: string): Promise<ReplicationState> {
        const state = await this.db.query(
            `SELECT pushCursor as cursor,pushOffset as offset from _replicationStates where id="${collectionName}"`,
        );
        if (state && state.values && state.values.length) {
            const { cursor, offset } = state.values[0];
            return { cursor, offset };
        } else return { cursor: 0, offset: 0 };
    }
    async getReplicationPullState(collectionName: string): Promise<ReplicationState> {
        const state = await this.db.query(
            `SELECT pullCursor as cursor,pullOffset as offset from _replicationStates where id="${collectionName}"`,
        );
        if (state && state.values && state.values.length) {
            const { cursor, offset } = state.values[0];
            return { cursor, offset };
        } else return { cursor: 0, offset: 0 };
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
    updateReplicationPushState(collectionName: string, offset: number, cursor: number): Promise<any> {
        return this.db.execute(
            `UPDATE _replicationStates set "pushOffset"=${offset},"pushCursor"=${cursor} where id="${collectionName}"`,
        );
    }
    updateReplicationPullState(collectionName: string, offset: number, cursor: number): Promise<any> {
        return this.db.execute(
            `UPDATE _replicationStates set "pullOffset"=${offset},"pullCursor"=${cursor} where id="${collectionName}"`,
        );
    }
}
