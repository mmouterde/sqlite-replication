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
    describe('upsert', () => {
        it('should generate SQL from random object', async () => {
            const resultingSQL = await ReplicationHelpers.getUpsertStatement('users', { id: 123, firstName: 'Andrew' });
            expect(resultingSQL).toEqual(
                `INSERT INTO "users" ("id","firstName") values (123,'Andrew')
            ON CONFLICT DO UPDATE SET "id"=excluded."id","firstName"=excluded."firstName"`,
            );
        });
        it('should generate SQL from random object changing undefined to null', async () => {
            const resultingSQL = await ReplicationHelpers.getUpsertStatement(
                'users',
                {
                    id: 123,
                    firstName: 'Andrew',
                    lastName: undefined,
                },
                { ignoreUndefinedProperties: false },
            );
            expect(resultingSQL).toEqual(
                `INSERT INTO "users" ("id","firstName","lastName") values (123,'Andrew',NULL)
            ON CONFLICT DO UPDATE SET "id"=excluded."id","firstName"=excluded."firstName","lastName"=excluded."lastName"`,
            );
        });
        it('should generate SQL from random object ignored undefined properties', async () => {
            const resultingSQL = await ReplicationHelpers.getUpsertStatement(
                'users',
                {
                    id: 123,
                    firstName: 'Andrew',
                    lastName: undefined,
                },
                { ignoreUndefinedProperties: true },
            );
            expect(resultingSQL).toEqual(
                `INSERT INTO "users" ("id","firstName") values (123,'Andrew')
            ON CONFLICT DO UPDATE SET "id"=excluded."id","firstName"=excluded."firstName"`,
            );
        });
    });
    describe('safeValue', () => {
        it('should wrap strings with single quotes', async () => {
            expect(ReplicationHelpers.safeValue('value')).toEqual(`'value'`);
        });
        it('should escape single quote, replaced by two single quotes', async () => {
            expect(ReplicationHelpers.safeValue("value with single quote in : 'here' ")).toEqual(
                "'value with single quote in : ''here'' '",
            );
        });
        it('should not wrap numbers', async () => {
            expect(ReplicationHelpers.safeValue(5.2)).toEqual('5.2');
        });
        it('should convert dates to timestamp', async () => {
            expect(ReplicationHelpers.safeValue(new Date('2023-01-01'))).toEqual(1672531200000);
        });
        it('should keep null', async () => {
            expect(ReplicationHelpers.safeValue(null)).toEqual('NULL');
        });
        it('should map undefined to null', async () => {
            let val;
            expect(ReplicationHelpers.safeValue(val)).toEqual('NULL');
        });
        it('should convert boolean to 0/1', async () => {
            expect(ReplicationHelpers.safeValue(true)).toEqual('1');
        });
        it('should convert boolean to 0/1', async () => {
            expect(ReplicationHelpers.safeValue(false)).toEqual('0');
        });
        it('should stringify object', async () => {
            expect(ReplicationHelpers.safeValue({ id: 1, toto: 2 })).toEqual(`'{"id":1,"toto":2}'`);
        });
        it("should stringify object with '", async () => {
            expect(ReplicationHelpers.safeValue({ id: 1, toto: "coucou o'bryan" })).toEqual(
                `'{"id":1,"toto":"coucou o''bryan"}'`,
            );
        });
        it('should stringify array', async () => {
            expect(ReplicationHelpers.safeValue([1, 2, 3])).toEqual(`'[1,2,3]'`);
        });
        it("should stringify array with '", async () => {
            expect(ReplicationHelpers.safeValue(["o'connor", { id: 5 }, 3])).toEqual(`'["o''connor",{"id":5},3]'`);
        });
    });
});
