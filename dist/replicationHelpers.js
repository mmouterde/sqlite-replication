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
exports.getReplicationState = exports.ensureFetchPush = exports.ensureFetchPull = exports.ensureRequiredColumns = exports.safeValue = exports.getDefaultCollectionOptions = void 0;
const EXPECTED_COLUMNS = ['id', '_forkParent', 'updatedAt', 'deletedAt'];
function getDefaultCollectionOptions(db, collectionName, options = {}) {
    return {
        name: collectionName,
        batchSize: options.batchSize || 10,
        countDocumentsUpdatedAt: (updatedAt) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const results = yield db.query(`SELECT count(*) FROM "${collectionName}" where "updatedAt"=${updatedAt};`);
            if (results && results.values && results.values.length && results.values[0]) {
                return ((_a = results === null || results === void 0 ? void 0 : results.values[0]) === null || _a === void 0 ? void 0 : _a.count) || 0;
            }
            else
                return 0;
        }),
        upsertAll: (documents) => {
            if (!documents.length)
                return Promise.resolve();
            if (options.map) {
                documents = documents.map(options.map);
            }
            const keys = Object.keys(documents[0]);
            const values = documents.map((document) => `(${keys.map((key) => safeValue(document[key])).join()})`);
            const conflictUpdate = keys.map((key) => `"${key}"=excluded."${key}"`).join();
            return db.execute(`INSERT INTO "${collectionName}" (${keys
                .map((key) => `"${key}"`)
                .join()}) values ${values.join()}
            ON CONFLICT DO UPDATE SET ${conflictUpdate}`);
        },
        deleteAll: (documents) => {
            if (!documents.length)
                return Promise.resolve();
            return db.execute(`UPDATE  "${collectionName}" SET  "deletedAt"=unixepoch(), "updatedAt"=unixepoch() WHERE id IN (${documents
                .map((document) => safeValue(document.id))
                .join()});`);
        },
    };
}
exports.getDefaultCollectionOptions = getDefaultCollectionOptions;
function safeValue(value) {
    if (value === null) {
        return 'NULL';
    }
    else if (typeof value === 'string') {
        return `'${value.replaceAll("'", "''")}'`;
    }
    else if (typeof value === 'boolean') {
        return value ? '1' : '0';
    }
    else if (value.toISOString) {
        return value.getTime();
    }
    else {
        return value.toString();
    }
}
exports.safeValue = safeValue;
function ensureRequiredColumns(db, collections) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const collection of collections) {
            const columnNames = yield db.getDefinedColumns(collection.name);
            if (columnNames) {
                for (const expectedColum of EXPECTED_COLUMNS) {
                    const columnExists = columnNames.some((columnName) => columnName === expectedColum);
                    if (!columnExists) {
                        throw new Error(`Table "${collection.name}" has no "${expectedColum}" column.`);
                    }
                }
            }
        }
    });
}
exports.ensureRequiredColumns = ensureRequiredColumns;
function ensureFetchPull(config) {
    if (!config.fetchPull)
        throw Error('fetchPull is missing in ReplicationOptions');
    if (!(config.fetchPull instanceof Function))
        throw new Error('fetchPull in ReplicationOptions should be a function (PullConfig)=>Promise');
}
exports.ensureFetchPull = ensureFetchPull;
function ensureFetchPush(config) {
    if (!config.fetchPush)
        throw Error('fetchPush is missing in ReplicationOptions');
    if (!(config.fetchPush instanceof Function))
        throw new Error('fetchPull in ReplicationOptions should be a function ()=>Promise');
}
exports.ensureFetchPush = ensureFetchPush;
function getReplicationState(db, collection) {
    return __awaiter(this, void 0, void 0, function* () {
        const { cursor, offset } = yield db.getReplicationState(collection.name);
        return { cursor, limit: collection.batchSize || 20, offset };
    });
}
exports.getReplicationState = getReplicationState;
