import type { Severity, DamageExtraction } from 'src/types/damage-intelligence';

export type VehicleDamage = DamageExtraction & { severity: Severity; warnings?: string[] };
export type ZonePoint = { position: [number, number, number]; target: [number, number, number]; label: string };
