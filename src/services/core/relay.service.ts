import { IRelayService } from '../../interfaces';
import { SimplePool } from '../../interfaces';
import { PoolService } from './pool.service';

export class RelayService implements IRelayService {
    private pool: SimplePool;
    private relayUrls: string[] = [];

    constructor() {
        this.pool = new PoolService();
    }

    async ensureConnected(): Promise<void> {
        if (!this.isConnected()) {
            await this.connect(this.relayUrls);
        }
    }

    async connect(urls: string[]): Promise<void> {
        this.relayUrls = urls;
    }

    disconnect(): void {
        this.pool.close(this.relayUrls);
    }

    isConnected(): boolean {
        return this.relayUrls.length > 0;
    }

    getConnectedRelays(): string[] {
        return this.relayUrls;
    }

    getConnectedStatus(): boolean {
        return this.isConnected();
    }

    getPool(): SimplePool {
        return this.pool;
    }
}
