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
exports.ReplicationSQLiteStorage = void 0;
class ReplicationSQLiteStorage {
    constructor(db) {
        this.db = db;
    }
    getDefinedColumns(collectionName) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            return (((_a = (yield this.db.query(`PRAGMA table_info("${collectionName}");`)).values) === null || _a === void 0 ? void 0 : _a.map((column) => column.name)) || []);
        });
    }
    getReplicationState(collectionName) {
        return __awaiter(this, void 0, void 0, function* () {
            const state = yield this.db.query(`SELECT * from _replicationStates where id="${collectionName}"`);
            if (state && state.values && state.values.length) {
                const { cursor, offset } = state.values[0];
                return { cursor, offset };
            }
            else
                return { cursor: 0, offset: 0 };
        });
    }
    createReplicationStatesTable() {
        return this.db.execute(`
    CREATE TABLE IF NOT EXISTS _replicationStates (
      id TEXT PRIMARY KEY NOT NULL,
      cursor INTEGER DEFAULT 0,
      offset INTEGER DEFAULT 0
    );`);
    }
    updateReplicationState(collectionName, offset, cursor) {
        return this.db.execute(`UPDATE _replicationStates set "offset"=${offset},"cursor"=${cursor} where id="${collectionName}"`);
    }
}
exports.ReplicationSQLiteStorage = ReplicationSQLiteStorage;
