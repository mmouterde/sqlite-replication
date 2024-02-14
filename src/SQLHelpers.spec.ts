import { SQLHelpers } from './SQLHelpers';
import { ReplicationHelpers } from './replicationHelpers';

describe('SQLHelpers', () => {
    describe('safeValue', () => {
        it('should wrap strings with single quotes', async () => {
            expect(SQLHelpers.safeValue('value')).toEqual(`'value'`);
        });
        it('should escape single quote, replaced by two single quotes', async () => {
            expect(SQLHelpers.safeValue("value with single quote in : 'here' ")).toEqual(
                "'value with single quote in : ''here'' '",
            );
        });
        it('should not wrap numbers', async () => {
            expect(SQLHelpers.safeValue(5.2)).toEqual('5.2');
        });
        it('should convert dates to timestamp', async () => {
            expect(SQLHelpers.safeValue(new Date('2023-01-01'))).toEqual(1672531200000);
        });
        it('should keep null', async () => {
            expect(SQLHelpers.safeValue(null)).toEqual('NULL');
        });
        it('should map undefined to null', async () => {
            let val;
            expect(SQLHelpers.safeValue(val)).toEqual('NULL');
        });
        it('should convert boolean to 0/1', async () => {
            expect(SQLHelpers.safeValue(true)).toEqual('1');
        });
        it('should convert boolean to 0/1', async () => {
            expect(SQLHelpers.safeValue(false)).toEqual('0');
        });
        it('should stringify object', async () => {
            expect(SQLHelpers.safeValue({ id: 1, toto: 2 })).toEqual(`'{"id":1,"toto":2}'`);
        });
        it("should stringify object with '", async () => {
            expect(SQLHelpers.safeValue({ id: 1, toto: "coucou o'bryan" })).toEqual(
                `'{"id":1,"toto":"coucou o''bryan"}'`,
            );
        });
        it('should stringify array', async () => {
            expect(SQLHelpers.safeValue([1, 2, 3])).toEqual(`'[1,2,3]'`);
        });
        it("should stringify array with '", async () => {
            expect(SQLHelpers.safeValue(["o'connor", { id: 5 }, 3])).toEqual(`'["o''connor",{"id":5},3]'`);
        });
    });
    describe('upsert', () => {
        it('should generate SQL from random object', () => {
            const resultingSQL = SQLHelpers.getUpsertStatement('users', { id: 123, firstName: 'Andrew' });
            expect(resultingSQL).toEqual(
                `INSERT INTO "users" ("id","firstName") values (123,'Andrew')
            ON CONFLICT DO UPDATE SET "id"=excluded."id","firstName"=excluded."firstName"`,
            );
        });
        it('should generate SQL from random object changing undefined to null', () => {
            const resultingSQL = SQLHelpers.getUpsertStatement(
                'users',
                {
                    id: 123,
                    firstName: 'Andrew',
                    lastName: undefined,
                },
                { excludeUndefinedProperties: false },
            );
            expect(resultingSQL).toEqual(
                `INSERT INTO "users" ("id","firstName","lastName") values (123,'Andrew',NULL)
            ON CONFLICT DO UPDATE SET "id"=excluded."id","firstName"=excluded."firstName","lastName"=excluded."lastName"`,
            );
        });
        it('should generate SQL from random object ignored undefined properties', () => {
            const resultingSQL = SQLHelpers.getUpsertStatement('users', {
                id: 123,
                firstName: 'Andrew',
                lastName: undefined,
            });
            expect(resultingSQL).toEqual(
                `INSERT INTO "users" ("id","firstName") values (123,'Andrew')
            ON CONFLICT DO UPDATE SET "id"=excluded."id","firstName"=excluded."firstName"`,
            );
        });
    });
});
