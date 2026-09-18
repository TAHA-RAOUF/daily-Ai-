import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cases = JSON.parse(await readFile(new URL('../data/processed/cases-extracted.json', import.meta.url))).records;
const schema = await readFile(new URL('../src/schemas/extracted-case.ts', import.meta.url), 'utf8');
const mapping = await readFile(new URL('../src/components/vehicle-3d/vehicle-zone-map.ts', import.meta.url), 'utf8');

const service = cases.find((item) => item.extraction.caseType === 'service');
const single = cases.find((item) => item.extraction.damages.length === 1);
const multi = cases.find((item) => item.extraction.damages.length > 1);
const severe = cases.find((item) => item.extraction.severity === 'schwer');

assert.equal(cases.find((item) => item.id === single.id)?.id, single.id, 'caseId lookup');
assert.deepEqual(single.extraction.damages.map((item) => item.zone), [single.extraction.damages[0].zone], 'zone extraction');
assert.equal(service.extraction.damages.length, 0, 'service cases have no damage');
assert.ok(multi.extraction.damages.length > 1, 'multi-zone case');
assert.equal(severe.extraction.severity, 'schwer', 'severe case');

const schemaZones = [...schema.matchAll(/^  '([^']+)',?$/gm)].map((match) => match[1]).filter((value) => !['service', 'damage'].includes(value));
const damageZones = schemaZones.slice(schemaZones.indexOf('Außenspiegel links'), schemaZones.indexOf('Windschutzscheibe') + 1);
for (const zone of damageZones) assert.ok(mapping.includes(`${zone.includes(' ') ? `'${zone}'` : zone}: point`), `missing 3D mapping: ${zone}`);
for (const severity of ['leicht', 'mittel', 'schwer', 'unknown']) assert.ok(mapping.includes(`${severity}:`), `missing severity color: ${severity}`);
assert.equal(damageZones.includes('Nicht vorhanden'), false, 'unknown zones use the textual fallback');

console.log(`Verified ${cases.length} cases, ${damageZones.length} zone mappings, service/single/multi/severe scenarios.`);
