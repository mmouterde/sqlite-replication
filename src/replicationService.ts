import { BehaviorSubject } from 'rxjs';
import {ensureFetchPull, ensureFetchPush, ensureRequiredColumns, getReplicationState} from './replicationHelpers';
import {PulledCollection, ReplicationConfig, ReplicationOptions, ReplicationStorage} from './replication';

export class ReplicationService {
    constructor(private db: ReplicationStorage, private options: ReplicationOptions) {}
    public replicationCompleted = new BehaviorSubject({ success: true });

    /**
     * - Create replicationStates table if required
     * - ensure collections match tables with required columns : id, deletedAt, updatedAt, _forkParent
     */
    async init() {
        ensureFetchPull(this.options);
        ensureFetchPush(this.options);
        await ensureRequiredColumns(this.db, this.options.collections);
        await this.db.createReplicationStatesTable();
    }
    /**
     * run replicate
     */
    async replicate() {
        await this.push();
        await this.pull();
        this.replicationCompleted.next({ success: true });
    }
    async push() {
        const pullConfig = new Map<string, ReplicationConfig>();
        for (const collection of this.options.collections) {
            pullConfig.set(collection.name, await getReplicationState(this.db, collection));
        }
        let shouldIterate = false;
        do {
            shouldIterate = await this.pushIteration(pullConfig);
        } while (shouldIterate);
    }
    async pull() {
        const pullConfig = new Map<string, ReplicationConfig>();
        for (const collection of this.options.collections) {
            pullConfig.set(collection.name, await getReplicationState(this.db, collection));
        }
        let shouldIterate = false;
        do {
            shouldIterate = await this.pullIteration(pullConfig);
        } while (shouldIterate);
    }

    async pullIteration(pullConfig: Map<string, ReplicationConfig>) {
        const response = await this.options.fetchPull({ collections: Object.fromEntries(pullConfig.entries()) });
        let requireAnotherBatch = false;
        for (const collection of this.options.collections) {
            const pullResult = response.collections[collection.name] as PulledCollection;
            if (pullResult) {
                await collection.upsertAll(
                    pullResult.documents
                        .filter((document) => !document.deletedAt)
                        .map((document) => ({
                            ...document,
                            _forkParent: JSON.stringify(document),
                        })),
                );
                await collection.deleteAll(pullResult.documents.filter((document) => document.deletedAt));

                if (pullResult.documents.length) {
                    const newCursor = pullResult.documents[pullResult.documents.length - 1].updatedAt;
                    const newOffset = await collection.countDocumentsUpdatedAt(newCursor);
                    await this.db.updateReplicationState(collection.name, newOffset, newCursor);
                    const collectionPullConfig = pullConfig.get(collection.name);
                    if (collectionPullConfig && pullResult.hasMoreChanges) {
                        requireAnotherBatch = true;
                        collectionPullConfig.cursor = newCursor;
                        collectionPullConfig.offset = newOffset;
                    } else {
                        pullConfig.delete(collection.name);
                    }
                } else {
                    pullConfig.delete(collection.name);
                }
            }
        }
        return requireAnotherBatch;
    }
}
