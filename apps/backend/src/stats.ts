export interface DriftStats {
  totalPrsProcessed: number;
  totalDriftDetected: number;
  driftByType: Record<string, number>;
  driftByFile: Record<string, number>;
  lastProcessed: string | null;
}

const stats: DriftStats = {
  totalPrsProcessed: 0,
  totalDriftDetected: 0,
  driftByType: {},
  driftByFile: {},
  lastProcessed: null,
};

export function recordDrift(report: any) {
  stats.totalPrsProcessed++;
  stats.lastProcessed = new Date().toISOString();

  for (const item of report.items) {
    stats.totalDriftDetected++;
    
    stats.driftByType[item.type] = (stats.driftByType[item.type] || 0) + 1;
    stats.driftByFile[item.filePath] = (stats.driftByFile[item.filePath] || 0) + 1;
  }
}

export function getStats(): DriftStats {
  return stats;
}
