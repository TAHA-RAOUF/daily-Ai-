import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const samplePath = path.join(
  root,
  'data/samples/evaluation-cases.json'
);

const outputPath = path.join(
  root,
  'data/processed/evaluation-predictions.json'
);

const apiUrl =
  process.env.API_URL ??
  'http://localhost:8083/api/analyze-damage/';

const limit = Number.parseInt(process.env.LIMIT ?? '3', 10);
const delayMs = Number.parseInt(process.env.DELAY_MS ?? '1000', 10);

if (!Number.isInteger(limit) || limit < 1) {
  throw new Error('LIMIT must be a positive integer.');
}

const sampleFile = JSON.parse(
  await readFile(samplePath, 'utf8')
);

const evaluationCases = sampleFile.cases;

async function loadExistingPredictions() {
  try {
    const content = await readFile(outputPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {
        updatedAt: null,
        apiUrl,
        predictions: [],
      };
    }

    throw error;
  }
}

const existingFile = await loadExistingPredictions();

const predictionsById = new Map(
  existingFile.predictions.map((item) => [
    item.caseId,
    item,
  ])
);

const sampleOrder = new Map(
  evaluationCases.map((item, index) => [
    item.id,
    index,
  ])
);

const pendingCases = evaluationCases
  .filter((item) => {
    const previous = predictionsById.get(item.id);

    return !previous || previous.status !== 'success';
  })
  .slice(0, limit);

async function savePredictions() {
  const predictions = Array.from(
    predictionsById.values()
  ).sort((a, b) => {
    return (
      sampleOrder.get(a.caseId) -
      sampleOrder.get(b.caseId)
    );
  });

  await mkdir(path.dirname(outputPath), {
    recursive: true,
  });

  await writeFile(
    outputPath,
    `${JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        apiUrl,
        predictions,
      },
      null,
      2
    )}\n`,
    'utf8'
  );
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function extractCase(item) {
  const response = await fetch(apiUrl, {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
    },

    body: JSON.stringify({
      caseId: item.id,

      // Never send item.expected to the API.
      freitext: item.freitext,
    }),
  });

  const responseText = await response.text();

  let responseBody;

  try {
    responseBody = JSON.parse(responseText);
  } catch {
    throw new Error(
      `API returned invalid JSON: ${responseText.slice(0, 300)}`
    );
  }

  if (!response.ok) {
    const details =
      responseBody.details ??
      responseBody.error ??
      `HTTP ${response.status}`;

    throw new Error(
      typeof details === 'string'
        ? details
        : JSON.stringify(details)
    );
  }

  if (!responseBody.data) {
    throw new Error(
      'API response does not contain a data property.'
    );
  }

  return responseBody.data;
}

if (pendingCases.length === 0) {
  console.log('No pending evaluation cases.');
  console.log(`Results: ${outputPath}`);
  process.exit(0);
}

console.log(
  `Processing ${pendingCases.length} of ${evaluationCases.length} evaluation cases...`
);

let failureCount = 0;

for (const [index, item] of pendingCases.entries()) {
  const position = index + 1;

  console.log(
    `[${position}/${pendingCases.length}] Processing case ${item.id} (${item.sampleGroup})`
  );

  try {
    const prediction = await extractCase(item);

    predictionsById.set(item.id, {
      caseId: item.id,
      sampleGroup: item.sampleGroup,
      status: 'success',
      processedAt: new Date().toISOString(),
      prediction,
    });

    console.log(
      `Case ${item.id}: ${prediction.caseType} / ${prediction.caseKind}`
    );
  } catch (error) {
    failureCount += 1;

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    predictionsById.set(item.id, {
      caseId: item.id,
      sampleGroup: item.sampleGroup,
      status: 'failed',
      processedAt: new Date().toISOString(),
      error: message,
    });

    console.error(
      `Case ${item.id} failed: ${message}`
    );
  }

  // Save after every request so progress is not lost.
  await savePredictions();

  if (position < pendingCases.length) {
    await wait(delayMs);
  }
}

console.log('');
console.log(`Saved predictions to ${outputPath}`);

if (failureCount > 0) {
  console.error(`${failureCount} case(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('All requested cases succeeded.');
}