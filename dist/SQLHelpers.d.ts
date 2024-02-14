export declare class SQLHelpers {
    static safeValue(value: any): any;
    static getUpsertStatement(collectionName: string, document: any, option?: {
        excludeUndefinedProperties: boolean;
    }): string;
}
