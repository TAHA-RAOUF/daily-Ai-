import type { ZonePoint } from './types';
import type { Severity, DamageZone } from 'src/types/damage-intelligence';

const point = (label: DamageZone, position: [number, number, number]): ZonePoint => ({ label, position, target: position });

export const vehicleZoneMap: Record<DamageZone, ZonePoint> = {
  'Außenspiegel links': point('Außenspiegel links', [-1.05, 0.45, 0.35]),
  'Außenspiegel rechts': point('Außenspiegel rechts', [1.05, 0.45, 0.35]),
  Beifahrertür: point('Beifahrertür', [1.0, 0.05, 0.1]),
  Dach: point('Dach', [0, 0.95, 0]),
  Fahrertür: point('Fahrertür', [-1.0, 0.05, 0.1]),
  Heckklappe: point('Heckklappe', [0, 0.35, -1.85]),
  'Kotflügel hinten links': point('Kotflügel hinten links', [-0.95, 0.1, -1.15]),
  'Kotflügel hinten rechts': point('Kotflügel hinten rechts', [0.95, 0.1, -1.15]),
  'Kotflügel vorne links': point('Kotflügel vorne links', [-0.95, 0.15, 1.15]),
  'Kotflügel vorne rechts': point('Kotflügel vorne rechts', [0.95, 0.15, 1.15]),
  Motorhaube: point('Motorhaube', [0, 0.62, 1.2]),
  'Schweller links': point('Schweller links', [-0.95, -0.5, 0]),
  'Schweller rechts': point('Schweller rechts', [0.95, -0.5, 0]),
  'Stoßstange hinten': point('Stoßstange hinten', [0, -0.15, -1.95]),
  'Stoßstange hinten links': point('Stoßstange hinten links', [-0.72, -0.15, -1.85]),
  'Stoßstange hinten rechts': point('Stoßstange hinten rechts', [0.72, -0.15, -1.85]),
  'Stoßstange vorne': point('Stoßstange vorne', [0, -0.15, 1.95]),
  'Stoßstange vorne links': point('Stoßstange vorne links', [-0.72, -0.15, 1.85]),
  'Stoßstange vorne rechts': point('Stoßstange vorne rechts', [0.72, -0.15, 1.85]),
  'Tür hinten links': point('Tür hinten links', [-1.0, 0.05, -0.65]),
  'Tür hinten rechts': point('Tür hinten rechts', [1.0, 0.05, -0.65]),
  Windschutzscheibe: point('Windschutzscheibe', [0, 0.72, 0.55]),
};

export const severityColors: Record<'leicht' | 'mittel' | 'schwer' | 'unknown', string> = { leicht: '#f5b400', mittel: '#ed6c02', schwer: '#d32f2f', unknown: '#637381' };
export function severityColor(severity: Severity) { return severityColors[severity ?? 'unknown']; }
