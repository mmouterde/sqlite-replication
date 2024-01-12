import { ReplicationService } from './replicationService';
import { ReplicationTestStorage } from './replicationTestStorage';
import { ReplicationCollectionOptions, ReplicationConfig, ReplicationOptions, ReplicationStorage } from './replication';
import { ReplicationHelpers } from './replicationHelpers';

describe('replicationService', () => {
    describe('replicationService push', () => {
        async function testReplicationPush(
            documents,
            replicationPushState = { users: { offset: 0, cursor: 0 } },
            batchSize = 10,
        ) {
            const stateUpdates = [];
            const storage = new ReplicationTestStorage(null, replicationPushState, (collectionName, offset, cursor) => {
                stateUpdates.push({ collectionName, offset, cursor });
                return Promise.resolve();
            });
            //arrays to fill as proofs and make assertions
            const pushConfigs: ReplicationConfig[] = [];
            const config = {
                collections: [
                    {
                        name: 'users',
                        batchSize,
                        getDocumentOffset: (cursor, id) =>
                            Promise.resolve(
                                documents.filter((document) => document.updatedAt === cursor && document.id <= id)
                                    .length,
                            ),
                        // Here is the way to get an empty push : get empty array with `findChanges`
                        findChanges: (state: ReplicationConfig) => {
                            const filteredDocuments = documents.filter(
                                (document) => document.updatedAt >= state.cursor,
                            );
                            const paginatedDocuments = filteredDocuments.slice(
                                state.offset,
                                state.offset + state.limit,
                            );
                            return Promise.resolve(paginatedDocuments);
                        },
                        upsertAll: () => Promise.resolve(),
                        deleteAll: () => Promise.resolve(),
                    },
                ],
                fetchPush: (pushConfig: any) => {
                    pushConfigs.push(JSON.parse(JSON.stringify(pushConfig)));
                    return Promise.resolve();
                },
                fetchPull: () => Promise.resolve([]),
            };
            const replicationService = new ReplicationService(storage, config);
            await replicationService.push();
            return { pushConfigs, stateUpdates };
        }

        it('should not call push once due to empty collection', async () => {
            const { pushConfigs, stateUpdates } = await testReplicationPush([], { users: { offset: 0, cursor: 0 } });
            expect(pushConfigs).toEqual([]);
            expect(stateUpdates).toEqual([]);
        });
        it('should call push once and having a single doc to push (first push)', async () => {
            const { pushConfigs, stateUpdates } = await testReplicationPush([{ id: 123, updatedAt: 1 }], {
                users: { offset: 0, cursor: 0 },
            });
            expect(pushConfigs).toEqual([{ collections: { users: [{ id: 123, updatedAt: 1 }] } }]);
            expect(stateUpdates).toEqual([{ collectionName: 'users', cursor: 1, offset: 1 }]);
        });
        it('should call push once and having a single doc to push  (not first push)', async () => {
            const { pushConfigs, stateUpdates } = await testReplicationPush(
                [
                    { id: 123, updatedAt: 1 },
                    { id: 124, updatedAt: 2 },
                ],
                {
                    users: { offset: 1, cursor: 1 },
                },
            );
            expect(pushConfigs).toEqual([{ collections: { users: [{ id: 124, updatedAt: 2 }] } }]);
            expect(stateUpdates).toEqual([{ collectionName: 'users', cursor: 2, offset: 1 }]);
        });
        it('should call push once and having a multiple docs to push', async () => {
            const { pushConfigs, stateUpdates } = await testReplicationPush(
                [
                    { id: 123, updatedAt: 1 },
                    { id: 124, updatedAt: 2 },
                    { id: 125, updatedAt: 2 },
                    { id: 126, updatedAt: 3 },
                ],
                {
                    users: { offset: 1, cursor: 1 },
                },
            );
            expect(pushConfigs).toEqual([
                {
                    collections: {
                        users: [
                            { id: 124, updatedAt: 2 },
                            { id: 125, updatedAt: 2 },
                            { id: 126, updatedAt: 3 },
                        ],
                    },
                },
            ]);
            expect(stateUpdates).toEqual([{ collectionName: 'users', cursor: 3, offset: 1 }]);
        });
        it('should call push once and having a multiple docs to push and paginate', async () => {
            const { pushConfigs, stateUpdates } = await testReplicationPush(
                [
                    { id: 123, updatedAt: 1 },
                    { id: 124, updatedAt: 2 },
                    { id: 125, updatedAt: 2 },
                    { id: 126, updatedAt: 3 },
                ],
                {
                    users: { offset: 1, cursor: 1 },
                },
                1,
            );
            expect(pushConfigs).toEqual([
                { collections: { users: [{ id: 124, updatedAt: 2 }] } },
                { collections: { users: [{ id: 125, updatedAt: 2 }] } },
                { collections: { users: [{ id: 126, updatedAt: 3 }] } },
            ]);
            expect(stateUpdates).toEqual([
                { collectionName: 'users', cursor: 2, offset: 1 },
                { collectionName: 'users', cursor: 2, offset: 2 },
                { collectionName: 'users', cursor: 3, offset: 1 },
            ]);
        });
        it('should paginate on multiple cursor document', async () => {
            const { pushConfigs, stateUpdates } = await testReplicationPush(
                [
                    { id: 123, updatedAt: 1 },
                    { id: 124, updatedAt: 1 },
                    { id: 125, updatedAt: 2 },
                    { id: 126, updatedAt: 2 },
                    { id: 127, updatedAt: 2 },
                    { id: 128, updatedAt: 2 },
                    { id: 129, updatedAt: 2 },
                ],
                {
                    users: { offset: 1, cursor: 1 },
                },
                2,
            );
            expect(pushConfigs).toEqual([
                {
                    collections: {
                        users: [
                            { id: 124, updatedAt: 1 },
                            { id: 125, updatedAt: 2 },
                        ],
                    },
                },
                {
                    collections: {
                        users: [
                            { id: 126, updatedAt: 2 },
                            { id: 127, updatedAt: 2 },
                        ],
                    },
                },
                {
                    collections: {
                        users: [
                            { id: 128, updatedAt: 2 },
                            { id: 129, updatedAt: 2 },
                        ],
                    },
                },
            ]);
            expect(stateUpdates).toEqual([
                { collectionName: 'users', cursor: 2, offset: 1 },
                { collectionName: 'users', cursor: 2, offset: 3 },
                { collectionName: 'users', cursor: 2, offset: 5 },
            ]);
        });
    });
    describe('replicationService pull', () => {
        describe('replicatePull one empty collection', () => {
            async function testReplication(fetchPull: (pullConfig: any) => Promise<any>) {
                // empty replication storage
                const storage = new ReplicationTestStorage({ users: { offset: 0, cursor: 0 } }, null);
                //arrays to fill as proofs and make assertions
                const upserted: any[] = [];
                const deleted: any[] = [];
                const pullConfigs: ReplicationConfig[] = [];

                const config = {
                    collections: [
                        {
                            name: 'users',
                            batchSize: 10,
                            getDocumentOffset: () => Promise.resolve(1),
                            findChanges: (state: ReplicationConfig) => Promise.resolve([]),
                            upsertAll: (documents: any) => {
                                upserted.push(documents);
                                return Promise.resolve();
                            },
                            deleteAll: (documents: any) => {
                                deleted.push(documents);
                                return Promise.resolve();
                            },
                        },
                    ],
                    fetchPull: (pullConfig: any) => {
                        pullConfigs.push(JSON.parse(JSON.stringify(pullConfig)));
                        return fetchPull(pullConfig);
                    },
                    fetchPush: () => Promise.resolve(),
                };
                const replicationService = new ReplicationService(storage, config);
                await replicationService.pull();
                return { upserted, deleted, pullConfigs };
            }

            it('should call pull once, empty pull case', async () => {
                const { upserted, deleted, pullConfigs } = await testReplication(() =>
                    Promise.resolve({
                        collections: {
                            users: {
                                documents: [],
                                hasMoreChanges: false,
                            },
                        },
                    }),
                );
                expect(upserted).toEqual([[]]);
                expect(deleted).toEqual([[]]);
                expect(pullConfigs).toEqual([
                    {
                        collections: {
                            users: {
                                cursor: 0,
                                limit: 10,
                                offset: 0,
                            },
                        },
                    },
                ]);
            });
            it('should call pull once, empty db + 1 updated document', async () => {
                const { upserted, deleted, pullConfigs } = await testReplication(() =>
                    Promise.resolve({
                        collections: {
                            users: {
                                documents: [{ id: 'id', deletedAt: null, updatedAt: 123 }],
                                hasMoreChanges: false,
                            },
                        },
                    }),
                );
                expect(pullConfigs).toEqual([
                    {
                        collections: {
                            users: {
                                cursor: 0,
                                limit: 10,
                                offset: 0,
                            },
                        },
                    },
                ]);
                //has much as documents that returned (not deleted) (grouped by iteration)
                expect(upserted).toEqual([
                    [
                        {
                            _forkParent: '{"id":"id","deletedAt":null,"updatedAt":123}',
                            deletedAt: null,
                            id: 'id',
                            updatedAt: 123,
                        },
                    ],
                ]);
                //has much as documents that returned (grouped by iteration)
                expect(deleted).toEqual([[]]);
            });
            it('should call pull once, empty db + 1 deleted document', async () => {
                const { upserted, deleted, pullConfigs } = await testReplication(() =>
                    Promise.resolve({
                        collections: {
                            users: {
                                documents: [{ id: 'id', deletedAt: 456, updatedAt: 123 }],
                                hasMoreChanges: false,
                            },
                        },
                    }),
                );
                //has much as pullConfigs than iteration. So only one here.
                expect(pullConfigs).toEqual([
                    {
                        collections: {
                            users: {
                                cursor: 0,
                                limit: 10,
                                offset: 0,
                            },
                        },
                    },
                ]);
                //has much as documents that returned (not deleted) (grouped by iteration)
                expect(upserted).toEqual([[]]);
                //has much as documents that returned (grouped by iteration)
                expect(deleted).toEqual([
                    [
                        {
                            deletedAt: 456,
                            id: 'id',
                            updatedAt: 123,
                        },
                    ],
                ]);
            });
            it('should call pull once, empty db + 1 deleted document + 1 updated document', async () => {
                const { upserted, deleted, pullConfigs } = await testReplication(() =>
                    Promise.resolve({
                        collections: {
                            users: {
                                documents: [
                                    { id: 'id1', deletedAt: null, updatedAt: 123 },
                                    { id: 'id2', deletedAt: 456, updatedAt: 123 },
                                ],
                                hasMoreChanges: false,
                            },
                        },
                    }),
                );
                //has much as pullConfigs than iteration. So only one here.
                expect(pullConfigs).toEqual([
                    {
                        collections: {
                            users: {
                                cursor: 0,
                                limit: 10,
                                offset: 0,
                            },
                        },
                    },
                ]);
                //has much as documents that returned (not deleted) (grouped by iteration)
                expect(upserted).toEqual([
                    [
                        {
                            _forkParent: '{"id":"id1","deletedAt":null,"updatedAt":123}',
                            deletedAt: null,
                            id: 'id1',
                            updatedAt: 123,
                        },
                    ],
                ]);
                //has much as documents that returned (grouped by iteration)
                expect(deleted).toEqual([
                    [
                        {
                            deletedAt: 456,
                            id: 'id2',
                            updatedAt: 123,
                        },
                    ],
                ]);
            });
            it('should call pull twice,  1 deleted document then 1 updated document', async () => {
                const { upserted, deleted, pullConfigs } = await testReplication((pullConfig) => {
                    return Promise.resolve({
                        collections: {
                            users: {
                                documents: [
                                    //return the id1 user only if cursor is 0
                                    ...(pullConfig.collections.users.cursor === 0
                                        ? [{ id: 'id1', deletedAt: null, updatedAt: 123 }]
                                        : []),
                                    //return the id2 user only if cursor is 123
                                    ...(pullConfig.collections.users.cursor === 123
                                        ? [{ id: 'id2', deletedAt: 456, updatedAt: 123 }]
                                        : []),
                                ],
                                //return only the first time
                                hasMoreChanges: pullConfig.collections.users.cursor === 0,
                            },
                        },
                    });
                });
                expect(pullConfigs).toEqual([
                    {
                        collections: {
                            users: {
                                cursor: 0,
                                limit: 10,
                                offset: 0,
                            },
                        },
                    },
                    {
                        collections: {
                            users: {
                                cursor: 123,
                                limit: 10,
                                offset: 1,
                            },
                        },
                    },
                ]);
                expect(upserted).toEqual([
                    [
                        {
                            _forkParent: '{"id":"id1","deletedAt":null,"updatedAt":123}',
                            deletedAt: null,
                            id: 'id1',
                            updatedAt: 123,
                        },
                    ],
                    [],
                ]);
                expect(deleted).toEqual([
                    [],
                    [
                        {
                            deletedAt: 456,
                            id: 'id2',
                            updatedAt: 123,
                        },
                    ],
                ]);
            });
        });
        describe('replicatePull one filled collection', () => {
            // that case mean that there is 4 documents with the same cursor, pullconfig should ask the same cursor by with an offset of 4 to skip the already known
            async function testReplication(fetchPull: any) {
                // empty replication storage
                const storage = new ReplicationTestStorage({ users: { offset: 4, cursor: 123 } }, null);
                //arrays to fill as proofs and make assertions
                const upserted: any[] = [];
                const deleted: any[] = [];
                const pullConfigs: ReplicationConfig[] = [];

                const config: ReplicationOptions = {
                    collections: [
                        {
                            name: 'users',
                            batchSize: 10,
                            getDocumentOffset: () => Promise.resolve(4),
                            findChanges: () => Promise.resolve([]),
                            upsertAll: (documents) => {
                                upserted.push(documents);
                                return Promise.resolve();
                            },
                            deleteAll: (documents) => {
                                deleted.push(documents);
                                return Promise.resolve();
                            },
                        },
                    ],
                    fetchPull: (pullConfig) => {
                        pullConfigs.push(JSON.parse(JSON.stringify(pullConfig)));
                        return fetchPull(pullConfig);
                    },
                    fetchPush: () => Promise.resolve(),
                };
                const replicationService = new ReplicationService(storage, config);
                await replicationService.pull();
                return { upserted, deleted, pullConfigs };
            }

            it('should ask the same cursor by with an offset of 4 to skip the already known', async () => {
                const { upserted, deleted, pullConfigs } = await testReplication(() =>
                    Promise.resolve({
                        collections: {
                            users: {
                                documents: [],
                                hasMoreChanges: false,
                            },
                        },
                    }),
                );
                expect(upserted).toEqual([[]]);
                expect(deleted).toEqual([[]]);
                expect(pullConfigs).toEqual([
                    {
                        collections: {
                            users: {
                                cursor: 123,
                                limit: 10,
                                offset: 4,
                            },
                        },
                    },
                ]);
            });
        });
        describe('replicatePull two collection', () => {
            async function testReplication(fetchPull: (a: any) => Promise<any>) {
                // empty replication storage
                const storage = new ReplicationTestStorage(
                    {
                        users: { offset: 0, cursor: 0 },
                        companies: { offset: 0, cursor: 0 },
                    },
                    null,
                );
                //arrays to fill as proofs and make assertions
                const upserted: any[] = [];
                const deleted: any[] = [];
                const pullConfigs: ReplicationConfig[] = [];

                const config = {
                    collections: [
                        {
                            name: 'users',
                            batchSize: 10,
                            getDocumentOffset: () => Promise.resolve(1),
                            findChanges: () => Promise.resolve([]),
                            upsertAll: (documents: any) => {
                                upserted.push(documents);
                                return Promise.resolve();
                            },
                            deleteAll: (documents: any) => {
                                deleted.push(documents);
                                return Promise.resolve();
                            },
                        },
                        {
                            name: 'companies',
                            batchSize: 10,
                            getDocumentOffset: () => Promise.resolve(1),
                            findChanges: () => Promise.resolve([]),
                            upsertAll: (documents: any) => {
                                upserted.push(documents);
                                return Promise.resolve();
                            },
                            deleteAll: (documents: any) => {
                                deleted.push(documents);
                                return Promise.resolve();
                            },
                        },
                    ],
                    fetchPull: (pullConfig: any) => {
                        pullConfigs.push(JSON.parse(JSON.stringify(pullConfig)));
                        return fetchPull(pullConfig);
                    },
                    fetchPush: () => Promise.resolve(),
                };
                const replicationService = new ReplicationService(storage, config);
                await replicationService.pull();
                return { upserted, deleted, pullConfigs };
            }

            it('should call pull once, 1 updated user, 1 companies', async () => {
                const { upserted, deleted, pullConfigs } = await testReplication(() =>
                    Promise.resolve({
                        collections: {
                            users: {
                                documents: [{ id: 'userId', deletedAt: null, updatedAt: 123 }],
                                hasMoreChanges: false,
                            },
                            companies: {
                                documents: [{ id: 'companyId', deletedAt: null, updatedAt: 24 }],
                                hasMoreChanges: false,
                            },
                        },
                    }),
                );
                expect(pullConfigs).toEqual([
                    {
                        collections: {
                            companies: {
                                cursor: 0,
                                limit: 10,
                                offset: 0,
                            },
                            users: {
                                cursor: 0,
                                limit: 10,
                                offset: 0,
                            },
                        },
                    },
                ]);
                expect(upserted).toEqual([
                    [
                        {
                            _forkParent: '{"id":"userId","deletedAt":null,"updatedAt":123}',
                            deletedAt: null,
                            id: 'userId',
                            updatedAt: 123,
                        },
                    ],
                    [
                        {
                            _forkParent: '{"id":"companyId","deletedAt":null,"updatedAt":24}',
                            deletedAt: null,
                            id: 'companyId',
                            updatedAt: 24,
                        },
                    ],
                ]);
                expect(deleted).toEqual([[], []]);
            });
            it('should call pull twice one for user and the first companies, one for the last company', async () => {
                const { upserted, deleted, pullConfigs } = await testReplication((pullConfig) =>
                    Promise.resolve({
                        collections: {
                            users: pullConfig.collections.users
                                ? {
                                      documents: [{ id: 'userId', deletedAt: null, updatedAt: 123 }],
                                      hasMoreChanges: false,
                                  }
                                : undefined,
                            companies: {
                                documents:
                                    pullConfig.collections.companies.cursor === 0
                                        ? [{ id: 'companyId', deletedAt: null, updatedAt: 24 }]
                                        : [{ id: 'companyId2', deletedAt: null, updatedAt: 5 }],
                                hasMoreChanges: pullConfig.collections.companies.cursor === 0,
                            },
                        },
                    }),
                );
                expect(pullConfigs).toEqual([
                    {
                        collections: {
                            companies: {
                                cursor: 0,
                                limit: 10,
                                offset: 0,
                            },
                            users: {
                                cursor: 0,
                                limit: 10,
                                offset: 0,
                            },
                        },
                    },
                    {
                        collections: {
                            companies: {
                                cursor: 24,
                                limit: 10,
                                offset: 1,
                            },
                        },
                    },
                ]);
                expect(upserted).toEqual([
                    [
                        {
                            _forkParent: '{"id":"userId","deletedAt":null,"updatedAt":123}',
                            deletedAt: null,
                            id: 'userId',
                            updatedAt: 123,
                        },
                    ],
                    [
                        {
                            _forkParent: '{"id":"companyId","deletedAt":null,"updatedAt":24}',
                            deletedAt: null,
                            id: 'companyId',
                            updatedAt: 24,
                        },
                    ],
                    [
                        {
                            _forkParent: '{"id":"companyId2","deletedAt":null,"updatedAt":5}',
                            deletedAt: null,
                            id: 'companyId2',
                            updatedAt: 5,
                        },
                    ],
                ]);
                expect(deleted).toEqual([[], [], []]);
            });
        });
        describe('getReplicationPullState', () => {
            it('should use storage to define offset and cursor', async () => {
                const storage = typeMock<ReplicationStorage>({
                    getReplicationPullState() {
                        return Promise.resolve({ offset: 123, cursor: 456 });
                    },
                });
                const collectionOption = typeMock<ReplicationCollectionOptions>({ batchSize: 789 });

                const replicationService = new ReplicationService(storage, {
                    collections: [],
                    fetchPull: () => Promise.resolve(),
                    fetchPush: () => Promise.resolve(),
                });

                expect(await replicationService.getReplicationPullState(collectionOption)).toEqual({
                    limit: 789,
                    offset: 123,
                    cursor: 456,
                });
            });
            it('should use 20 as limit default if not provided by ReplicationCollectionOptions', async () => {
                const storage = typeMock<ReplicationStorage>({
                    getReplicationPullState() {
                        return Promise.resolve({ offset: 123, cursor: 456 });
                    },
                });
                const collectionOption = typeMock<ReplicationCollectionOptions>({});
                const replicationService = new ReplicationService(storage, {
                    collections: [],
                    fetchPull: () => Promise.resolve(),
                    fetchPush: () => Promise.resolve(),
                });
                expect(await replicationService.getReplicationPullState(collectionOption)).toEqual({
                    limit: 20,
                    offset: 123,
                    cursor: 456,
                });
            });
        });
    });
});

function typeMock<A>(obj: Partial<A>): A {
    return obj as A;
}
