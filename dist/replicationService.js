import { BehaviorSubject } from 'rxjs';
import ReplicationHelpers from './replicationHelpers';
export class ReplicationService {
    db;
    options;
    constructor(db, options) {
        this.db = db;
        this.options = options;
    }
    replicationCompleted = new BehaviorSubject({ success: true });
    /**
     * - Create replicationStates table if required
     * - ensure collections match tables with required columns : id, deletedAt, updatedAt, _forkParent
     */
    async init() {
        ReplicationHelpers.ensureFetchPull(this.options);
        ReplicationHelpers.ensureFetchPush(this.options);
        await ReplicationHelpers.ensureRequiredColumns(this.db, this.options.collections);
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
        const pullConfig = new Map();
        for (const collection of this.options.collections) {
            pullConfig.set(collection.name, await ReplicationHelpers.getReplicationState(this.db, collection));
        }
        let shouldIterate = false;
        do {
            //shouldIterate = await this.pushIteration(pullConfig);
        } while (shouldIterate);
    }
    async pull() {
        const pullConfig = new Map();
        for (const collection of this.options.collections) {
            pullConfig.set(collection.name, await ReplicationHelpers.getReplicationState(this.db, collection));
        }
        let shouldIterate = false;
        do {
            shouldIterate = await this.pullIteration(pullConfig);
        } while (shouldIterate);
    }
    async pullIteration(pullConfig) {
        const response = await this.options.fetchPull({ collections: Object.fromEntries(pullConfig.entries()) });
        let requireAnotherBatch = false;
        for (const collection of this.options.collections) {
            const pullResult = response.collections[collection.name];
            if (pullResult) {
                await collection.upsertAll(pullResult.documents
                    .filter((document) => !document.deletedAt)
                    .map((document) => ({
                    ...document,
                    _forkParent: JSON.stringify(document),
                })));
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
                    }
                    else {
                        pullConfig.delete(collection.name);
                    }
                }
                else {
                    pullConfig.delete(collection.name);
                }
            }
        }
        return requireAnotherBatch;
    }
}
