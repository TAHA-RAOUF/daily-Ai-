export type CaseType = 'service' | 'damage';

export type CaseKind =
  | 'Parkschaden'
  | 'Auffahrunfall'
  | 'Hagelschaden'
  | 'Steinschlag'
  | 'Vandalismus'
  | 'Wildunfall'
  | 'Rangierschaden'
  | 'Ölwechsel'
  | 'Inspektion'
  | 'HU/AU'
  | 'Räder und Reifen'
  | 'Bremsen';

export type Severity = 'leicht' | 'mittel' | 'schwer' | null;
export type InsuranceType =
  | 'gesteuert'
  | 'haftpflicht_gegner'
  | 'selbstzahler'
  | 'teilkasko'
  | 'vollkasko'
  | null;
export type DamageAction = 'inspect' | 'repair' | 'paint' | 'replace' | 'unknown';

export type DamageZone =
  | 'Außenspiegel links'
  | 'Außenspiegel rechts'
  | 'Beifahrertür'
  | 'Dach'
  | 'Fahrertür'
  | 'Heckklappe'
  | 'Kotflügel hinten links'
  | 'Kotflügel hinten rechts'
  | 'Kotflügel vorne links'
  | 'Kotflügel vorne rechts'
  | 'Motorhaube'
  | 'Schweller links'
  | 'Schweller rechts'
  | 'Stoßstange hinten'
  | 'Stoßstange hinten links'
  | 'Stoßstange hinten rechts'
  | 'Stoßstange vorne'
  | 'Stoßstange vorne links'
  | 'Stoßstange vorne rechts'
  | 'Tür hinten links'
  | 'Tür hinten rechts'
  | 'Windschutzscheibe';

export type DamageExtraction = {
  zone: DamageZone;
  damageType: string;
  action: DamageAction;
  confidence: number;
  evidence: string;
};

export type WorkshopStatus = 'New' | 'Assessment' | 'Repair planned' | 'In repair' | 'Completed';

export type ProcessedDamageCase = {
  id: number;
  vehicle: { manufacturer: string; model: string; modelType: string; firstRegistration: string; mileage: number };
  caseType: CaseType;
  caseKind: CaseKind;
  severity: Severity;
  insurance: InsuranceType;
  status: string;
  statusDone: boolean;
  inOpenList: boolean;
  note: string;
  damages: DamageExtraction[];
  overallConfidence: number;
  warnings: string[];
  operations: { orderCount: number; workshopTaskCount: number; workLoadTotal: number };
  states: { id: number; name: string; category: string; isDone: boolean }[];
  receivedAt: string;
  processedAt: string;
};

export type DashboardAnalytics = {
  totalCases: number;
  damageCases: number;
  openCases: number;
  replacementRecommendations: number;
  averageConfidence: number;
  topZones: { zone: DamageZone; count: number }[];
  typeDistribution: { label: 'Service' | 'Damage'; count: number }[];
  severityDistribution: { severity: Severity; count: number }[];
};

export type CountDistribution = { label: string; count: number };

export type RealDashboardAnalytics = {
  generatedAt: string;
  summary: { totalCases: number; serviceCases: number; damageCases: number; openWorklistCases: number; replacementRecommendationCases: number; averageDamageConfidence: number; manualReviewCases: number; casesWithWarnings: number; unknownActionDamages: number };
  distributions: { caseTypes: CountDistribution[]; caseKinds: CountDistribution[]; severities: CountDistribution[]; insuranceTypes: CountDistribution[]; damageZones: CountDistribution[]; repairActions: CountDistribution[]; manufacturers: CountDistribution[]; statuses: CountDistribution[] };
  topDamageZones: CountDistribution[];
};

export type EvaluationReport = {
  generatedAt: string;
  coverage: { sourceCases: number; extractedCases: number; evaluatedCases: number; missingCases: number; coverageRate: number };
  accuracy: { caseType: number; caseKind: number; severityDamageCases: number; insuranceDamageCases: number; exactZonesDamageCases: number };
  zones: { truePositives: number; falsePositives: number; falseNegatives: number; precision: number; recall: number; f1: number };
  incorrectCaseCount: number;
  incorrectCases: { caseId: number; correct: Record<string, boolean>; zoneErrors: { invented: string[]; missing: string[] } }[];
};
