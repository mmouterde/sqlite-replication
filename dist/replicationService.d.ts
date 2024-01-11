import { BehaviorSubject } from 'rxjs';
import { ReplicationConfig, ReplicationOptions, ReplicationStorage } from './replication';
export declare class ReplicationService {
    private db;
    private options;
    constructor(db: ReplicationStorage, options: ReplicationOptions);
    replicationCompleted: BehaviorSubject<{
        success: boolean;
    }>;
    /**
     * - Create replicationStates table if required
     * - ensure collections match tables with required columns : id, deletedAt, updatedAt, _forkParent
     */
    init(): Promise<void>;
    /**
     * run replicate
     */
    replicate(): Promise<void>;
    push(): Promise<void>;
    pull(): Promise<void>;
    pullIteration(pullConfig: Map<string, ReplicationConfig>): Promise<boolean>;
}
