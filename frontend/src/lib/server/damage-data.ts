import 'server-only';

import type { DamageExtraction, EvaluationReport, ProcessedDamageCase, RealDashboardAnalytics } from 'src/types/damage-intelligence';

import path from 'node:path';
import { readFile } from 'node:fs/promises';

type RawRecord = {
  id: number; createdAt: string; updatedAt: string; canceledAt: string | null; inOpenList: boolean;
  vehicle: { manufacturer: string; model: string; modelType: string; firstRegistration: string; mileage: number };
  currentStatus: { name: string; is_done: boolean };
  states: { id: number; name: string; category: string; is_done: boolean }[];
  operations: { orderCount: number; workshopTaskCount: number; workLoadTotal: number };
  freitext: string;
  extraction: { caseId: number; caseType: ProcessedDamageCase['caseType']; caseKind: ProcessedDamageCase['caseKind']; severity: ProcessedDamageCase['severity']; insuranceType: ProcessedDamageCase['insurance']; damages: (Omit<DamageExtraction, 'evidence'> & { evidenceGerman: string })[]; warnings: string[] };
  processing: { promptVersion: string; processedAt: string };
};

type CasesFile = { promptVersion: string; updatedAt: string; totalSourceCases: number; successfulCases: number; records: RawRecord[] };

async function readJson<T>(filename: string): Promise<T> {
  try {
    return JSON.parse(await readFile(path.join(process.cwd(), 'data', 'processed', filename), 'utf8')) as T;
  } catch (error) {
    throw new Error(`Unable to load required processed data file: ${filename}`, { cause: error });
  }
}

function toCase(record: RawRecord): ProcessedDamageCase {
  return {
    id: record.id, vehicle: record.vehicle, caseType: record.extraction.caseType, caseKind: record.extraction.caseKind,
    severity: record.extraction.severity, insurance: record.extraction.insuranceType, status: record.currentStatus.name,
    statusDone: record.currentStatus.is_done, inOpenList: record.inOpenList, note: record.freitext,
    damages: record.extraction.damages.map(({ evidenceGerman, ...damage }) => ({ ...damage, evidence: evidenceGerman })),
    overallConfidence: record.extraction.damages.length ? record.extraction.damages.reduce((sum, damage) => sum + damage.confidence, 0) / record.extraction.damages.length : 1,
    warnings: record.extraction.warnings, operations: record.operations,
    states: record.states.map(({ is_done, ...state }) => ({ ...state, isDone: is_done })),
    receivedAt: record.createdAt, processedAt: record.processing.processedAt,
  };
}

export async function getDamageCases() { return (await readJson<CasesFile>('cases-extracted.json')).records.map(toCase); }
export async function getDamageCaseById(id: string | number) { const record = (await readJson<CasesFile>('cases-extracted.json')).records.find((item) => item.id === Number(id)); return record ? toCase(record) : undefined; }
export function getDashboardAnalytics() { return readJson<RealDashboardAnalytics>('analytics.json'); }
export function getEvaluationReport() { return readJson<EvaluationReport>('full-evaluation-report.json'); }
