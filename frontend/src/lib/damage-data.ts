import type { InsuranceType } from 'src/types/damage-intelligence';

const insuranceLabels: Record<NonNullable<InsuranceType>, string> = {
  gesteuert: 'Managed claim',
  haftpflicht_gegner: 'Third-party liability',
  selbstzahler: 'Self-pay',
  teilkasko: 'Partial coverage',
  vollkasko: 'Comprehensive coverage',
};

export function formatInsuranceType(value: InsuranceType) {
  return value ? insuranceLabels[value] : 'Not stated';
}
