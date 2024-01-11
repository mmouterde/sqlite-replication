import {
    ensureRequiredColumns,
    ensureFetchPush,
    ensureFetchPull,
    safeValue, getReplicationState,
} from './replicationHelpers';
import {ReplicationCollectionOptions, ReplicationOptions, ReplicationStorage} from "./replication";

function typeMock<A>(obj: Partial<A>): A {
    return obj as A;
}
function fuckTypeMock<A>(obj: any): A {
    return obj as A;
}

describe('replicationHelpers', () => {
    describe('getPullConfig', () => {
        it('should use storage to define offset and cursor', async () => {
            const storage = typeMock<ReplicationStorage>({
                getReplicationState() {
                    return Promise.resolve({ offset: 123, cursor: 456 });
                },
            });
            const collectionOption = typeMock<ReplicationCollectionOptions>({ batchSize: 789 });
            expect(await getReplicationState(storage, collectionOption)).toEqual({
                limit: 789,
                offset: 123,
                cursor: 456,
            });
        });
        it('should use 20 as limit default if not provided by ReplicationCollectionOptions', async () => {
            const storage = typeMock<ReplicationStorage>({
                getReplicationState() {
                    return Promise.resolve({ offset: 123, cursor: 456 });
                },
            });
            const collectionOption = typeMock<ReplicationCollectionOptions>({});
            expect(await getReplicationState(storage, collectionOption)).toEqual({
                limit: 20,
                offset: 123,
                cursor: 456,
            });
        });
    });
    describe('ensureFetchPush', () => {
        it('should be silent of fetchPush is provided', async () => {
            expect(() =>
                ensureFetchPush(typeMock<ReplicationOptions>({ fetchPush: () => Promise.resolve() })),
            ).not.toThrow();
        });
        it('should throw exception if no fetchPush defined', async () => {
            expect(() => ensureFetchPush(typeMock<ReplicationOptions>({}))).toThrow(
                'fetchPush is missing in ReplicationOptions',
            );
        });
        it('should throw exception if no fetchPush is not a function', async () => {
            expect(() => ensureFetchPush(fuckTypeMock<ReplicationOptions>({ fetchPush: 3 }))).toThrow(
                'fetchPull in ReplicationOptions should be a function ()=>Promise',
            );
        });
    });
    describe('ensureFetchPull', () => {
        it('should be silent of fetchPull is provided', async () => {
            expect(() =>
                ensureFetchPull(typeMock<ReplicationOptions>({ fetchPull: () => Promise.resolve(null) })),
            ).not.toThrow(Error);
        });
        it('should throw exception if no fetchPull defined', async () => {
            expect(() => ensureFetchPull(typeMock<ReplicationOptions>({}))).toThrow(
                'fetchPull is missing in ReplicationOptions',
            );
        });
        it('should throw exception if no fetchPull is not a function', async () => {
            expect(() => ensureFetchPull(fuckTypeMock<ReplicationOptions>({ fetchPull: 3 }))).toThrow(
                'fetchPull in ReplicationOptions should be a function (PullConfig)=>Promise',
            );
        });
    });
    describe('ensureRequiredColumns', () => {
        it('should be silent of required columns are provided', async () => {
            const storage = typeMock<ReplicationStorage>({
                getDefinedColumns: (columnName) =>
                    Promise.resolve(['id', '_forkParent', 'updatedAt', 'deletedAt', 'NotRequiredColumn']),
            });
            const collections = [
                typeMock<ReplicationCollectionOptions>({ name: 'collectionA' }),
                typeMock<ReplicationCollectionOptions>({ name: 'collectionB' }),
            ];
            await expect(ensureRequiredColumns(storage, collections)).resolves.toBeUndefined();
        });
        it('should throw Error if a required column is missing', async () => {
            const storage = typeMock<ReplicationStorage>({
                getDefinedColumns: (collectionName) =>
                    Promise.resolve([/* 'id', is missing ! */ '_forkParent', 'updatedAt', 'deletedAt']),
            });
            const collections = [typeMock<ReplicationCollectionOptions>({ name: 'collectionA' })];
            await expect(() => ensureRequiredColumns(storage, collections)).rejects.toThrow(
                'Table "collectionA" has no "id" column.',
            );
        });
    });
    describe('safeValue', () => {
        it('should wrap strings with single quotes', async () => {
            expect(safeValue('value')).toEqual(`'value'`);
        });
        it('should escape single quote, replaced by two single quotes', async () => {
            expect(safeValue("value with single quote in : 'here' ")).toEqual(
                "'value with single quote in : ''here'' '",
            );
        });
        it('should not wrap numbers', async () => {
            expect(safeValue(5.2)).toEqual('5.2');
        });
        it('should convert dates to timestamp', async () => {
            expect(safeValue(new Date('2023-01-01'))).toEqual(1672531200000);
        });
        it('should keep null', async () => {
            expect(safeValue(null)).toEqual('NULL');
        });
        it('should convert boolean to 0/1', async () => {
            expect(safeValue(true)).toEqual('1');
        });
        it('should convert boolean to 0/1', async () => {
            expect(safeValue(false)).toEqual('0');
        });
    });
});
