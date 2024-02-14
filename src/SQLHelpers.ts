export class SQLHelpers {
    static safeValue(value: any) {
        if (value === null || typeof value === 'undefined') {
            return 'NULL';
        } else if (value.toISOString) {
            return value.getTime();
        } else if (Array.isArray(value) || typeof value === 'object') {
            return `'${JSON.stringify(value).replaceAll("'", "''")}'`;
        } else if (typeof value === 'string') {
            return `'${(value as string).replaceAll("'", "''")}'`;
        } else if (typeof value === 'boolean') {
            return value ? '1' : '0';
        } else {
            return value.toString();
        }
    }

    static getUpsertStatement(
        collectionName: string,
        document: any,
        option: { excludeUndefinedProperties: boolean } = { excludeUndefinedProperties: true },
    ) {
        if (!document) throw Error('undefined document');
        const keys = Object.keys(document).filter(
            (key) => typeof document[key] !== 'undefined' || !option.excludeUndefinedProperties,
        );
        const values = keys.map((key) => SQLHelpers.safeValue(document[key])).join();
        const conflictUpdate = keys.map((key) => `"${key}"=excluded."${key}"`).join();
        return `INSERT INTO "${collectionName}" (${keys.map((key) => `"${key}"`).join()}) values (${values})
            ON CONFLICT DO UPDATE SET ${conflictUpdate}`;
    }
}
