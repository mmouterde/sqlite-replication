import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { ReplicationState, ReplicationStorage } from './replication';

export class ReplicationSQLiteStorage implements ReplicationStorage {
    constructor(private db: SQLiteDBConnection) {}

    async getDefinedColumns(collectionName: string) {
        return (
            (await this.db.query(`PRAGMA table_info("${collectionName}");`)).values?.map((column) => column.name) || []
        );
    }
    async getReplicationState(collectionName: string): Promise<ReplicationState> {
        const state = await this.db.query(`SELECT * from _replicationStates where id="${collectionName}"`);
        if (state && state.values && state.values.length) {
            const { cursor, offset } = state.values[0];
            return { cursor, offset };
        } else return { cursor: 0, offset: 0 };
    }
    createReplicationStatesTable() {
        return this.db.execute(`
    CREATE TABLE IF NOT EXISTS _replicationStates (
      id TEXT PRIMARY KEY NOT NULL,
      cursor INTEGER DEFAULT 0,
      offset INTEGER DEFAULT 0
    );`);
    }
    updateReplicationState(collectionName: string, offset: number, cursor: number): Promise<any> {
        return this.db.execute(
            `UPDATE _replicationStates set "offset"=${offset},"cursor"=${cursor} where id="${collectionName}"`,
        );
    }
}
