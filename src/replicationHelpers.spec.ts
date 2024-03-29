import { ReplicationHelpers } from './replicationHelpers';
import { ReplicationCollectionOptions, ReplicationOptions, ReplicationStorage } from './replication';

function typeMock<A>(obj: Partial<A>): A {
    return obj as A;
}
function fuckTypeMock<A>(obj: any): A {
    return obj as A;
}

describe('replicationHelpers', () => {
    describe('ensureFetchPush', () => {
        it('should be silent of fetchPush is provided', async () => {
            expect(() =>
                ReplicationHelpers.ensureFetchPush(
                    typeMock<ReplicationOptions>({ fetchPush: () => Promise.resolve([]) }),
                ),
            ).not.toThrow();
        });
        it('should throw exception if no fetchPush defined', async () => {
            expect(() => ReplicationHelpers.ensureFetchPush(typeMock<ReplicationOptions>({}))).toThrow(
                'fetchPush is missing in ReplicationOptions',
            );
        });
        it('should throw exception if no fetchPush is not a function', async () => {
            expect(() =>
                ReplicationHelpers.ensureFetchPush(fuckTypeMock<ReplicationOptions>({ fetchPush: 3 })),
            ).toThrow('fetchPull in ReplicationOptions should be a function ()=>Promise');
        });
    });
    describe('ensureFetchPull', () => {
        it('should be silent of fetchPull is provided', async () => {
            expect(() =>
                ReplicationHelpers.ensureFetchPull(
                    typeMock<ReplicationOptions>({ fetchPull: () => Promise.resolve(null) }),
                ),
            ).not.toThrow(Error);
        });
        it('should throw exception if no fetchPull defined', async () => {
            expect(() => ReplicationHelpers.ensureFetchPull(typeMock<ReplicationOptions>({}))).toThrow(
                'fetchPull is missing in ReplicationOptions',
            );
        });
        it('should throw exception if no fetchPull is not a function', async () => {
            expect(() =>
                ReplicationHelpers.ensureFetchPull(fuckTypeMock<ReplicationOptions>({ fetchPull: 3 })),
            ).toThrow('fetchPull in ReplicationOptions should be a function (PullConfig)=>Promise');
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
            await expect(ReplicationHelpers.ensureRequiredColumns(storage, collections)).resolves.toBeUndefined();
        });
        it('should throw Error if a required column is missing', async () => {
            const storage = typeMock<ReplicationStorage>({
                getDefinedColumns: (collectionName) =>
                    Promise.resolve([/* 'id', is missing ! */ '_forkParent', 'updatedAt', 'deletedAt']),
            });
            const collections = [typeMock<ReplicationCollectionOptions>({ name: 'collectionA' })];
            await expect(() => ReplicationHelpers.ensureRequiredColumns(storage, collections)).rejects.toThrow(
                'Table "collectionA" has no "id" column.',
            );
        });
    });
});
