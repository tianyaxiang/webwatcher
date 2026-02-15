import { promises as fs } from 'fs';
import path from 'path';
import type { WatchTarget, PageSnapshot, ChangeRecord, MonitorStats } from '@/types';

const DATA_DIR = process.env.DATA_DIR || './data';

export class StorageService {
  private dataDir: string;
  
  constructor() {
    this.dataDir = DATA_DIR;
  }
  
  private async ensureDir(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }
  
  private getFilePath(filename: string): string {
    return path.join(this.dataDir, filename);
  }
  
  // ============== Watch Targets ==============
  
  async getTargets(): Promise<WatchTarget[]> {
    try {
      await this.ensureDir(this.dataDir);
      const filePath = this.getFilePath('targets.json');
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }
  
  async saveTargets(targets: WatchTarget[]): Promise<void> {
    await this.ensureDir(this.dataDir);
    const filePath = this.getFilePath('targets.json');
    await fs.writeFile(filePath, JSON.stringify(targets, null, 2));
  }
  
  async addTarget(target: WatchTarget): Promise<void> {
    const targets = await this.getTargets();
    targets.push(target);
    await this.saveTargets(targets);
  }
  
  async updateTarget(id: string, updates: Partial<WatchTarget>): Promise<WatchTarget | null> {
    const targets = await this.getTargets();
    const index = targets.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    targets[index] = { ...targets[index], ...updates };
    await this.saveTargets(targets);
    return targets[index];
  }
  
  async deleteTarget(id: string): Promise<boolean> {
    const targets = await this.getTargets();
    const newTargets = targets.filter(t => t.id !== id);
    if (newTargets.length === targets.length) return false;
    
    await this.saveTargets(newTargets);
    return true;
  }
  
  async getTarget(id: string): Promise<WatchTarget | null> {
    const targets = await this.getTargets();
    return targets.find(t => t.id === id) || null;
  }
  
  // ============== Snapshots ==============
  
  async saveSnapshot(snapshot: PageSnapshot): Promise<void> {
    await this.ensureDir(path.join(this.dataDir, 'snapshots'));
    const filePath = path.join(this.dataDir, 'snapshots', `${snapshot.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2));
    
    // Also update the latest snapshot index
    await this.updateLatestSnapshot(snapshot.targetId, snapshot.id);
  }
  
  async getSnapshot(id: string): Promise<PageSnapshot | null> {
    try {
      const filePath = path.join(this.dataDir, 'snapshots', `${id}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }
  
  private async updateLatestSnapshot(targetId: string, snapshotId: string): Promise<void> {
    try {
      const indexPath = this.getFilePath('latest-snapshots.json');
      let index: Record<string, string> = {};
      
      try {
        const data = await fs.readFile(indexPath, 'utf-8');
        index = JSON.parse(data);
      } catch {
        // File doesn't exist yet
      }
      
      index[targetId] = snapshotId;
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
    } catch (error) {
      console.error('Failed to update latest snapshot index:', error);
    }
  }
  
  async getLatestSnapshot(targetId: string): Promise<PageSnapshot | null> {
    try {
      const indexPath = this.getFilePath('latest-snapshots.json');
      const data = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(data);
      const snapshotId = index[targetId];
      
      if (!snapshotId) return null;
      return this.getSnapshot(snapshotId);
    } catch (error) {
      return null;
    }
  }
  
  // ============== Change Records ==============
  
  async saveChange(change: ChangeRecord): Promise<void> {
    await this.ensureDir(path.join(this.dataDir, 'changes'));
    const filePath = path.join(this.dataDir, 'changes', `${change.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(change, null, 2));
    
    // Add to changes index
    await this.addToChangesIndex(change);
  }
  
  private async addToChangesIndex(change: ChangeRecord): Promise<void> {
    const indexPath = this.getFilePath('changes-index.json');
    let index: { id: string; targetId: string; detectedAt: string }[] = [];
    
    try {
      const data = await fs.readFile(indexPath, 'utf-8');
      index = JSON.parse(data);
    } catch {
      // File doesn't exist yet
    }
    
    index.unshift({
      id: change.id,
      targetId: change.targetId,
      detectedAt: change.detectedAt,
    });
    
    // Keep only last 1000 changes in index
    index = index.slice(0, 1000);
    
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }
  
  async getRecentChanges(limit: number = 50): Promise<ChangeRecord[]> {
    try {
      const indexPath = this.getFilePath('changes-index.json');
      const data = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(data).slice(0, limit);
      
      const changes: ChangeRecord[] = [];
      for (const item of index) {
        const change = await this.getChange(item.id);
        if (change) changes.push(change);
      }
      
      return changes;
    } catch (error) {
      return [];
    }
  }
  
  async getChange(id: string): Promise<ChangeRecord | null> {
    try {
      const filePath = path.join(this.dataDir, 'changes', `${id}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }
  
  async getChangesForTarget(targetId: string, limit: number = 20): Promise<ChangeRecord[]> {
    const allChanges = await this.getRecentChanges(200);
    return allChanges.filter(c => c.targetId === targetId).slice(0, limit);
  }
  
  // ============== Stats ==============
  
  async getStats(): Promise<MonitorStats> {
    const targets = await this.getTargets();
    const changes = await this.getRecentChanges(100);
    
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const changesLast24h = changes.filter(
      c => new Date(c.detectedAt) > oneDayAgo
    ).length;
    
    return {
      totalTargets: targets.length,
      activeTargets: targets.filter(t => t.enabled).length,
      totalChanges: changes.length,
      changesLast24h,
      lastCheckTime: targets
        .map(t => t.lastCheckedAt)
        .filter(Boolean)
        .sort()
        .reverse()[0],
    };
  }
}

export const storageService = new StorageService();