# sqlite-replication
A Typescript module to replicate SQLite DB with server.

`sqlite-replication` was designed for collaborative [offline-first](http://offlinefirst.org/) mobile app built with [capacitor sqlite plugin](https://github.com/capacitor-community/sqlite).

- Master > Slaves design
- Conflicts resolution on server side
- Framework agnostic (VueJs, React...)
- Server protocol agnostic (Rest API, GraphQL, websocket...)
- Query builder agnostic (no limit for SQL queries)
- Also Works with [jeep-sqlite](https://github.com/jepiqueau/jeep-sqlite)

## Inspired from
- [RxDB](https://rxdb.info/), a great module with reactivity : Please have a look.
- [capacitor-community/sqlite JSON Import/Export](https://github.com/capacitor-community/sqlite/blob/master/docs/ImportExportJson.md)

## Installation
`npm install sqlite-replication --save`

## Usage

```typescript
        
        // init your SQLite db as usual
        const db = ...
        
        const storage = new ReplicationSQLiteStorage(db);
        const replicationService = new ReplicationService(storage,
            {
                // Provide collections descriptor to replicate
                collections: [
                    // use a default helper
                    getDefaultCollectionOptions(db, 'users'),
                    // or define your own config
                    {
                        name: 'todos',
                        batchSize: 99,
                        countDocumentsUpdatedAt: async (updatedAt: number) => { ... },
                        upsertAll: (documents: any[]) => { ... },
                        deleteAll: (documents: any[]) => { ...},
                    }
                    
                ],
                
                // Define how to pull data from your own server (Rest, GraphQL... up to you)
                fetchPull: async (pullConfig: any) => (await api.post(`${URL_BASE}replicationPull`, pullConfig)).data,
                
                // Define how to push data to your server
                fetchPush: async () => (await api.post(`${URL_BASE}replicationPush`, {})).data,
            }
        );
        
        // init checkpoint table at app startup time
        await replicationService.init();
        
        // run replication (push then pull) when required, as often as you need
        await replicationService.replicate();
        
        //Enjoy SQL query as usual
```
### Client requirements
Ensure your tables have at least these columns :
- `id` as primary key (UUID recommended)
- `updateAt` as timestamp, the last document change date
- `deletedAt` as timestamp, the deletion date (if deleted)
- `_forkParent` as text, used for conflict handling.

### Server requirements
- Ensure documents properties include : 
  - `id`
  - `updateAt`
  - `deletedAt`
- note that `_forkParent` is not required in server storage and could be removed 
- API should return deleted documents ! Ensure no deletion, just add a `deletedAt` timestamp instead
- API should return documents in a predicable order. If you use SQL like database use `ORDER BY "updatedAt", "id"`
- drop foreign constraints, sorry but it's not relevant in a distributed context
- ensure `id` type and filled in a compatible way with distributed context (prefer UUID or similar)

### Server Example with node Express API

```typescript
const mobilePullBodySchema = {
    body: {
        type: 'object',
        properties: {
            // Map of collections to pull
            collections: {
                type: 'object',
                properties: {},
                // additional properties names should match SQLite table name
                additionalProperties: {
                    type: 'object',
                    properties: {
                        // The cursor (the last already pulled document updatedAt property, as integer)
                        cursor: { type: 'number', format: 'int64' },
                        // The number of documents to pull
                        limit: { type: 'number', format: 'int64' },
                        /*
                         * offset N documents.
                         * `updatedAt` should be the last date the document changes. Its use as cursor.
                         * But in case of multiple updates in a single query, several documents could have the same updatedAt value.
                         * This use-case breaks the cursor use and the paginating feature.
                         * As workaround, we use this parameter to know how much documents with the cursor value has already been pulled and paginate correctly.
                         */
                        offset: { type: 'number', format: 'int64' },
                    },
                    required: ['cursor', 'limit', 'offset'],
                },
            },
        },
        required: ['collections'],
    },
};

app.post('/replicationPull', validate(mobilePullBodySchema), async (req: APIRequest, res) => {
    const collections = {};
    
    // Query users only if required
    if ( req.body.collections.users ) {
        const { cursor, offset, limit } =  req.body.collections.users;
        const users = await database.select(
                'id',
                'name',
                'updatedAt',
                'deletedAt',
            )
            .from('users')
            // pay attention to predictability for paginating
            .orderBy(['updatedAt', 'id'])
            // get only changed users since the last updateAt value (>=)
            .where(database.knex.raw(`date_trunc('milliseconds',"updatedAt")`), '>=', cursor)
            // get the page data +1 to know if there is one more page next in a single sql query
            .limit(limit + 1)
            // skip the N first document with asked updateAt
            .offset(offset);
        }
        collections.users =  {
            // escape the last document if the page limit is reach (due to limit+1)
            documents: users.length > limit ? users.slice(0, -1) : users,
            // define if there is a next page
            hasMoreChanges: users.length > limit,
            cursor,
            offset,
            limit,
        });
    }    
    
    res.json({ collections });
});


router.post('/replicationPush', validate(replicationPushSchema), async (req: APIRequest, res) => {
    const collections = req.body.collections;
    if (collections.users) {
        await Promise.all(collections.users.map(pushUser));
    }
    res.json('ok');
});

async function pushUser(user) {
    const forkParent = user._forkParent;
    delete user._forkParent;
    // remotely created case (insert), not that `id` is filled by client
    if (forkParent.updatedAt === null) {
        // insert in DB, note that `updateAt` default value is now()
        return usersService.create(user)
    }
    // remotely deleted case (delete)
    else if (user.deletedAt) {
        // no deletion just flag the document with `deletedAt`=now() and `updateAt`=now() too.
        return usersService.update({...user,updateAt:Date.now()});
    }
    //remotely update case
    else if (forkParent.updatedAt !== user.updatedAt) {
        const serverDocument = await usersService.getById(user.id),
        
        // deleted on server (ignore remote update)
        if (!serverDocument || serverDocument.deletedAt) {
            return;
        }
        // no conflict case
        else if (serverDocument.updatedAt === forkParent.updatedAt) {
            return usersService.update({...user,updateAt:Date.now()});
        } else {
            const remoteChangedKeys = Object.keys(user).filter(
                (key) => JSON.stringify(user[key]) !== JSON.stringify(forkParent[key]),
            );
            const serverChangedKeys = Object.keys(user).filter(
                (key) => JSON.stringify(serverDocument[key]) !== JSON.stringify(forkParent[key]),
            );
            // handle conflict according to business rules
            ...
        }
    }
}
```



## Data model upgrades
[capacitor-community/sqlite UpgradeDatabaseVersion](https://github.com/capacitor-community/sqlite/blob/master/docs/UpgradeDatabaseVersion.md) works well and is provided by SQLite itself.
