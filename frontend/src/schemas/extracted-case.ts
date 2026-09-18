import { z } from 'zod';

export const caseTypeSchema = z.enum(['service', 'damage']);

export const caseKindSchema = z.enum([
  'Parkschaden',
  'Auffahrunfall',
  'Hagelschaden',
  'Steinschlag',
  'Vandalismus',
  'Wildunfall',
  'Rangierschaden',
  'Ölwechsel',
  'Inspektion',
  'HU/AU',
  'Räder und Reifen',
  'Bremsen',
]);

export const damageZoneSchema = z.enum([
  'Außenspiegel links',
  'Außenspiegel rechts',
  'Beifahrertür',
  'Dach',
  'Fahrertür',
  'Heckklappe',
  'Kotflügel hinten links',
  'Kotflügel hinten rechts',
  'Kotflügel vorne links',
  'Kotflügel vorne rechts',
  'Motorhaube',
  'Schweller links',
  'Schweller rechts',
  'Stoßstange hinten',
  'Stoßstange hinten links',
  'Stoßstange hinten rechts',
  'Stoßstange vorne',
  'Stoßstange vorne links',
  'Stoßstange vorne rechts',
  'Tür hinten links',
  'Tür hinten rechts',
  'Windschutzscheibe',
]);

export const severitySchema = z.enum(['leicht', 'mittel', 'schwer']);

export const insuranceTypeSchema = z.enum([
  'gesteuert',
  'haftpflicht_gegner',
  'selbstzahler',
  'teilkasko',
  'vollkasko',
]);

export const damageSchema = z
  .object({
    zone: damageZoneSchema,
    damageType: z.string().trim().min(1).max(100),
    action: z.enum(['inspect', 'repair', 'paint', 'replace', 'unknown']),
    evidenceGerman: z.string().trim().min(1).max(500),
    confidence: z.number().min(0).max(1),
  })
  .strict();

export const extractedCaseSchema = z
  .object({
    caseId: z.number().int().positive(),
    caseType: caseTypeSchema,
    caseKind: caseKindSchema,
    severity: severitySchema.nullable(),
    insuranceType: insuranceTypeSchema.nullable(),
    damages: z.array(damageSchema).max(12),
    warnings: z.array(z.string().trim().min(1).max(300)).max(10),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.caseType === 'service' && value.damages.length > 0) {
      context.addIssue({
        code: 'custom',
        path: ['damages'],
        message: 'Service cases must not contain damage zones.',
      });
    }

    if (value.caseType === 'damage' && value.damages.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['damages'],
        message: 'Damage cases must contain at least one damage zone.',
      });
    }

    const zones = value.damages.map((damage) => damage.zone);
    if (new Set(zones).size !== zones.length) {
      context.addIssue({
        code: 'custom',
        path: ['damages'],
        message: 'The same damage zone must not be returned more than once.',
      });
    }
  });

export type ExtractedCase = z.infer<typeof extractedCaseSchema>;
export type DamageZone = z.infer<typeof damageZoneSchema>;
