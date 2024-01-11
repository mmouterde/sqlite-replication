import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { ReplicationCollectionOptions, ReplicationConfig, ReplicationOptions, ReplicationStorage } from './replication';

const EXPECTED_COLUMNS = ['id', '_forkParent', 'updatedAt', 'deletedAt'];

export class ReplicationHelpers {
    static getDefaultCollectionOptions(
        db: SQLiteDBConnection,
        collectionName: string,
        options: { batchSize?: number; map?: (document: any) => any } = {},
    ): ReplicationCollectionOptions {
        return {
            name: collectionName,
            batchSize: options.batchSize || 10,
            countDocumentsUpdatedAt: async (updatedAt: number) => {
                const results = await db.query(
                    `SELECT count(*) FROM "${collectionName}" where "updatedAt"=${updatedAt};`,
                );
                if (results && results.values && results.values.length && results.values[0]) {
                    return results?.values[0]?.count || 0;
                } else return 0;
            },
            upsertAll: (documents: any[]) => {
                if (!documents.length) return Promise.resolve();
                if (options.map) {
                    documents = documents.map(options.map);
                }
                const keys = Object.keys(documents[0]);
                const values = documents.map(
                    (document) => `(${keys.map((key) => ReplicationHelpers.safeValue(document[key])).join()})`,
                );
                const conflictUpdate = keys.map((key) => `"${key}"=excluded."${key}"`).join();
                return db.execute(`INSERT INTO "${collectionName}" (${keys
                    .map((key) => `"${key}"`)
                    .join()}) values ${values.join()}
            ON CONFLICT DO UPDATE SET ${conflictUpdate}`);
            },
            deleteAll: (documents: any[]) => {
                if (!documents.length) return Promise.resolve();
                return db.execute(
                    `UPDATE  "${collectionName}" SET  "deletedAt"=unixepoch(), "updatedAt"=unixepoch() WHERE id IN (${documents
                        .map((document) => ReplicationHelpers.safeValue(document.id))
                        .join()});`,
                );
            },
        };
    }

    static safeValue(value: any) {
        if (value === null) {
            return 'NULL';
        } else if (typeof value === 'string') {
            return `'${(value as string).replaceAll("'", "''")}'`;
        } else if (typeof value === 'boolean') {
            return value ? '1' : '0';
        } else if (value.toISOString) {
            return value.getTime();
        } else {
            return value.toString();
        }
    }

    static async ensureRequiredColumns(db: ReplicationStorage, collections: ReplicationCollectionOptions[]) {
        for (const collection of collections) {
            const columnNames = await db.getDefinedColumns(collection.name);
            if (columnNames) {
                for (const expectedColum of EXPECTED_COLUMNS) {
                    const columnExists = columnNames.some((columnName) => columnName === expectedColum);
                    if (!columnExists) {
                        throw new Error(`Table "${collection.name}" has no "${expectedColum}" column.`);
                    }
                }
            }
        }
    }

    static ensureFetchPull(config: ReplicationOptions) {
        if (!config.fetchPull) throw Error('fetchPull is missing in ReplicationOptions');
        if (!(config.fetchPull instanceof Function))
            throw new Error('fetchPull in ReplicationOptions should be a function (PullConfig)=>Promise');
    }

    static ensureFetchPush(config: ReplicationOptions) {
        if (!config.fetchPush) throw Error('fetchPush is missing in ReplicationOptions');
        if (!(config.fetchPush instanceof Function))
            throw new Error('fetchPull in ReplicationOptions should be a function ()=>Promise');
    }

    static async getReplicationState(
        db: ReplicationStorage,
        collection: ReplicationCollectionOptions,
    ): Promise<ReplicationConfig> {
        const { cursor, offset } = await db.getReplicationState(collection.name);
        return { cursor, limit: collection.batchSize || 20, offset };
    }
}
