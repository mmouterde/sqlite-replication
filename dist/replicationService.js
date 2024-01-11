"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplicationService = void 0;
const rxjs_1 = require("rxjs");
const replicationHelpers_1 = require("./replicationHelpers");
class ReplicationService {
    constructor(db, options) {
        this.db = db;
        this.options = options;
        this.replicationCompleted = new rxjs_1.BehaviorSubject({ success: true });
    }
    /**
     * - Create replicationStates table if required
     * - ensure collections match tables with required columns : id, deletedAt, updatedAt, _forkParent
     */
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, replicationHelpers_1.ensureFetchPull)(this.options);
            (0, replicationHelpers_1.ensureFetchPush)(this.options);
            yield (0, replicationHelpers_1.ensureRequiredColumns)(this.db, this.options.collections);
            yield this.db.createReplicationStatesTable();
        });
    }
    /**
     * run replicate
     */
    replicate() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.push();
            yield this.pull();
            this.replicationCompleted.next({ success: true });
        });
    }
    push() {
        return __awaiter(this, void 0, void 0, function* () {
            const pullConfig = new Map();
            for (const collection of this.options.collections) {
                pullConfig.set(collection.name, yield (0, replicationHelpers_1.getReplicationState)(this.db, collection));
            }
            let shouldIterate = false;
            do {
                shouldIterate = yield this.pushIteration(pullConfig);
            } while (shouldIterate);
        });
    }
    pull() {
        return __awaiter(this, void 0, void 0, function* () {
            const pullConfig = new Map();
            for (const collection of this.options.collections) {
                pullConfig.set(collection.name, yield (0, replicationHelpers_1.getReplicationState)(this.db, collection));
            }
            let shouldIterate = false;
            do {
                shouldIterate = yield this.pullIteration(pullConfig);
            } while (shouldIterate);
        });
    }
    pullIteration(pullConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.options.fetchPull({ collections: Object.fromEntries(pullConfig.entries()) });
            let requireAnotherBatch = false;
            for (const collection of this.options.collections) {
                const pullResult = response.collections[collection.name];
                if (pullResult) {
                    yield collection.upsertAll(pullResult.documents
                        .filter((document) => !document.deletedAt)
                        .map((document) => (Object.assign(Object.assign({}, document), { _forkParent: JSON.stringify(document) }))));
                    yield collection.deleteAll(pullResult.documents.filter((document) => document.deletedAt));
                    if (pullResult.documents.length) {
                        const newCursor = pullResult.documents[pullResult.documents.length - 1].updatedAt;
                        const newOffset = yield collection.countDocumentsUpdatedAt(newCursor);
                        yield this.db.updateReplicationState(collection.name, newOffset, newCursor);
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
        });
    }
}
exports.ReplicationService = ReplicationService;
