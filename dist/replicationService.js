import { BehaviorSubject } from 'rxjs';
import { ReplicationHelpers } from './replicationHelpers';
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
        const replicationStatesByCollectionName = new Map();
        for (const collection of this.options.collections) {
            replicationStatesByCollectionName.set(collection.name, await this.getReplicationPushState(collection));
        }
        let shouldIterate = false;
        do {
            shouldIterate = await this.pushIteration(replicationStatesByCollectionName);
        } while (shouldIterate);
    }
    async pull() {
        const replicationStatesByCollectionName = new Map();
        for (const collection of this.options.collections) {
            replicationStatesByCollectionName.set(collection.name, await this.getReplicationPullState(collection));
        }
        let shouldIterate = false;
        do {
            shouldIterate = await this.pullIteration(replicationStatesByCollectionName);
        } while (shouldIterate);
    }
    async pullIteration(replicationStatesByCollectionName) {
        const response = await this.options.fetchPull({
            collections: Object.fromEntries(replicationStatesByCollectionName.entries()),
        });
        let requireAnotherBatch = false;
        try {
            await this.db.beginTransaction();
            for (const collection of this.options.collections) {
                const pullResult = response.collections[collection.name];
                if (pullResult) {
                    const documents = pullResult.documents;
                    await collection.upsertAll(documents
                        .filter((document) => !document.deletedAt)
                        .map((document) => ({
                        ...document,
                        _forkParent: JSON.stringify(document),
                    })));
                    await collection.deleteAll(documents.filter((document) => document.deletedAt));
                    if (documents.length) {
                        const lastDocument = documents[documents.length - 1];
                        const newCursor = lastDocument.updatedAt;
                        const newOffset = await collection.getDocumentOffset(newCursor, lastDocument.id);
                        await this.db.updateReplicationPullState(collection.name, newOffset, newCursor);
                        const collectionPullConfig = replicationStatesByCollectionName.get(collection.name);
                        if (collectionPullConfig && pullResult.hasMoreChanges) {
                            requireAnotherBatch = true;
                            collectionPullConfig.cursor = newCursor;
                            collectionPullConfig.offset = newOffset;
                        }
                        else {
                            replicationStatesByCollectionName.delete(collection.name);
                        }
                    }
                    else {
                        replicationStatesByCollectionName.delete(collection.name);
                    }
                }
            }
            await this.db.commitTransaction();
        }
        catch (e) {
            if ((await this.db.isTransactionActive()).result) {
                await this.db.rollbackTransaction();
            }
            throw e;
        }
        return requireAnotherBatch;
    }
    async pushIteration(replicationStatesByCollectionName) {
        const changedDocumentByCollectionName = new Map();
        const updatesPushStates = [];
        let requireAnotherBatch = false;
        let hasData = false;
        try {
            await this.db.beginTransaction();
            for (const collection of this.options.collections) {
                const replicationState = replicationStatesByCollectionName.get(collection.name);
                if (replicationState) {
                    const documents = await collection.findChanges(replicationState);
                    if (documents && documents.length) {
                        hasData = true;
                        requireAnotherBatch = replicationState.limit > 0 && documents.length === replicationState.limit;
                        changedDocumentByCollectionName.set(collection.name, documents);
                        const lastDocument = documents[documents.length - 1];
                        const newCursor = lastDocument.updatedAt;
                        const newOffset = await collection.getDocumentOffset(newCursor, lastDocument.id);
                        replicationState.cursor = newCursor;
                        replicationState.offset = newOffset;
                        updatesPushStates.push(() => this.db.updateReplicationPushState(collection.name, newOffset, newCursor));
                    }
                }
            }
            if (hasData) {
                await this.options.fetchPush({
                    collections: Object.fromEntries(changedDocumentByCollectionName.entries()),
                });
                // if fetchPush succeed, updatePushStates in DB.
                await updatesPushStates.reduce((p, fn) => p.then(fn), Promise.resolve(null));
            }
            await this.db.commitTransaction();
        }
        catch (e) {
            if ((await this.db.isTransactionActive()).result) {
                await this.db.rollbackTransaction();
            }
            throw e;
        }
        return requireAnotherBatch;
    }
    async getReplicationPushState(collection) {
        const { cursor, offset } = await this.db.getReplicationPushState(collection.name);
        return { cursor, limit: collection.batchSize || 20, offset };
    }
    async getReplicationPullState(collection) {
        const { cursor, offset } = await this.db.getReplicationPullState(collection.name);
        return { cursor, limit: collection.batchSize || 20, offset };
    }
}
