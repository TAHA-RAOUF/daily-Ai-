import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const inputPath = path.join(
  root,
  'data/raw/kit/dataset/da-cases.json'
);

const outputPath = path.join(
  root,
  'data/samples/evaluation-cases.json'
);

const fileContent = await readFile(inputPath, 'utf8');
const cases = JSON.parse(fileContent).sort((a, b) => a.id - b.id);

const selectedIds = new Set();

function take(label, count, predicate) {
  const selected = cases
    .filter((item) => {
      return !selectedIds.has(item.id) && predicate(item);
    })
    .slice(0, count);

  if (selected.length !== count) {
    throw new Error(
      `${label}: expected ${count} cases, found ${selected.length}`
    );
  }

  selected.forEach((item) => {
    selectedIds.add(item.id);
  });

  return selected.map((item) => ({
    ...item,
    sampleGroup: label,
  }));
}

const serviceCases = take(
  'service',
  10,
  (item) => item.ground_truth.case_type === 'service'
);

const singleZoneDamageCases = take(
  'single-zone-damage',
  5,
  (item) =>
    item.ground_truth.case_type === 'damage' &&
    item.ground_truth.zones.length === 1
);

const multiZoneDamageCases = take(
  'multi-zone-damage',
  10,
  (item) =>
    item.ground_truth.case_type === 'damage' &&
    item.ground_truth.zones.length > 1
);

const heavyDamageCases = take(
  'heavy-damage',
  5,
  (item) =>
    item.ground_truth.case_type === 'damage' &&
    item.ground_truth.severity === 'schwer'
);

const sample = [
  ...serviceCases,
  ...singleZoneDamageCases,
  ...multiZoneDamageCases,
  ...heavyDamageCases,
].map(
  ({
    id,
    manufacturer,
    model,
    freitext,
    ground_truth,
    sampleGroup,
  }) => ({
    id,
    manufacturer,
    model,
    freitext,
    sampleGroup,

    // Used only to evaluate the DeepSeek prediction.
    // Never send this field to DeepSeek.
    expected: ground_truth,
  })
);

const output = {
  description:
    'Deterministic evaluation sample. Never send expected labels to the model.',
  total: sample.length,
  cases: sample,
};

await mkdir(path.dirname(outputPath), {
  recursive: true,
});

await writeFile(
  outputPath,
  `${JSON.stringify(output, null, 2)}\n`,
  'utf8'
);

console.log(
  `Created ${sample.length} evaluation cases at ${outputPath}`
);