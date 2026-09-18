import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const inputPath = path.join(
  root,
  'data/raw/kit/dataset/da-cases.json'
);

const outputPath = path.join(
  root,
  'data/processed/cases-extracted.json'
);

const errorsPath = path.join(
  root,
  'data/failed/extraction-errors.json'
);

const apiUrl =
  process.env.API_URL ??
  'http://localhost:8083/api/analyze-damage/';

const promptVersion = 'v2';

const limit = Number.parseInt(
  process.env.LIMIT ?? '10',
  10
);

const delayMs = Number.parseInt(
  process.env.DELAY_MS ?? '100',
  10
);

const maxRetries = Number.parseInt(
  process.env.MAX_RETRIES ?? '3',
  10
);

if (!Number.isInteger(limit) || limit < 1) {
  throw new Error('LIMIT must be a positive integer.');
}

if (!Number.isInteger(delayMs) || delayMs < 0) {
  throw new Error('DELAY_MS must be a positive integer or zero.');
}

if (!Number.isInteger(maxRetries) || maxRetries < 1) {
  throw new Error('MAX_RETRIES must be a positive integer.');
}

const sourceCases = JSON.parse(
  await readFile(inputPath, 'utf8')
);

async function readJsonFile(filePath, fallback) {
  try {
    const content = await readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return fallback;
    }

    throw error;
  }
}

const existingOutput = await readJsonFile(
  outputPath,
  {
    promptVersion,
    updatedAt: null,
    totalSourceCases: sourceCases.length,
    records: [],
  }
);

const existingErrors = await readJsonFile(
  errorsPath,
  {
    updatedAt: null,
    errors: [],
  }
);

if (
  existingOutput.promptVersion &&
  existingOutput.promptVersion !== promptVersion
) {
  throw new Error(
    `Existing output uses prompt ${existingOutput.promptVersion}, ` +
      `but this script uses ${promptVersion}.`
  );
}

const recordsById = new Map(
  existingOutput.records.map((record) => [
    record.id,
    record,
  ])
);

const errorsById = new Map(
  existingErrors.errors.map((item) => [
    item.caseId,
    item,
  ])
);

const sourceOrder = new Map(
  sourceCases.map((item, index) => [
    item.id,
    index,
  ])
);

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function toErrorMessage(error) {
  return error instanceof Error
    ? error.message
    : String(error);
}

async function saveProgress() {
  const records = Array.from(
    recordsById.values()
  ).sort((first, second) => {
    return (
      sourceOrder.get(first.id) -
      sourceOrder.get(second.id)
    );
  });

  const errors = Array.from(
    errorsById.values()
  ).sort((first, second) => {
    return (
      sourceOrder.get(first.caseId) -
      sourceOrder.get(second.caseId)
    );
  });

  await mkdir(path.dirname(outputPath), {
    recursive: true,
  });

  await mkdir(path.dirname(errorsPath), {
    recursive: true,
  });

  await writeFile(
    outputPath,
    `${JSON.stringify(
      {
        promptVersion,
        updatedAt: new Date().toISOString(),
        totalSourceCases: sourceCases.length,
        successfulCases: records.length,
        records,
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  await writeFile(
    errorsPath,
    `${JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        errors,
      },
      null,
      2
    )}\n`,
    'utf8'
  );
}

async function callExtractionApi(sourceCase) {
  const response = await fetch(apiUrl, {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
    },

    body: JSON.stringify({
      caseId: sourceCase.id,

      // Only the workshop note is sent to DeepSeek.
      // ground_truth is never sent.
      freitext: sourceCase.freitext,
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

async function extractWithRetry(sourceCase) {
  let lastError;

  for (
    let attempt = 1;
    attempt <= maxRetries;
    attempt += 1
  ) {
    try {
      return await callExtractionApi(sourceCase);
    } catch (error) {
      lastError = error;

      console.error(
        `Case ${sourceCase.id}, attempt ${attempt}/${maxRetries}: ` +
          toErrorMessage(error)
      );

      if (attempt < maxRetries) {
        await wait(attempt * 2000);
      }
    }
  }

  throw lastError;
}

function createProcessedRecord(sourceCase, extraction) {
  const currentStatus =
    sourceCase.states?.[0] ?? null;

  const workLoadTotal = (
    sourceCase.workshop_tasks ?? []
  ).reduce((total, task) => {
    return total + (task.work_load ?? 0);
  }, 0);

  return {
    id: sourceCase.id,

    createdAt: sourceCase.created_at,
    updatedAt: sourceCase.updated_at,
    canceledAt: sourceCase.canceled_at,
    inOpenList: sourceCase.in_open_list,

    vehicle: {
      manufacturer: sourceCase.manufacturer,
      model: sourceCase.model,
      modelType: sourceCase.model_type,
      firstRegistration:
        sourceCase.first_registration,
      mileage: sourceCase.mileage,
    },

    currentStatus,
    states: sourceCase.states ?? [],

    operations: {
      orderCount:
        sourceCase.orders?.length ?? 0,

      workshopTaskCount:
        sourceCase.workshop_tasks?.length ?? 0,

      workLoadTotal,
    },

    freitext: sourceCase.freitext,

    extraction,

    processing: {
      promptVersion,
      processedAt: new Date().toISOString(),
    },
  };
}

const pendingCases = sourceCases
  .filter((item) => !recordsById.has(item.id))
  .slice(0, limit);

if (pendingCases.length === 0) {
  console.log('No pending cases.');
  console.log(`Results: ${outputPath}`);
  process.exit(0);
}

console.log('');
console.log(
  `Processing ${pendingCases.length} cases`
);

console.log(
  `Already completed: ${recordsById.size}/${sourceCases.length}`
);

console.log(`Prompt version: ${promptVersion}`);
console.log(`API: ${apiUrl}`);
console.log('');

let failuresDuringRun = 0;

for (
  const [index, sourceCase] of pendingCases.entries()
) {
  const current = index + 1;

  console.log(
    `[${current}/${pendingCases.length}] ` +
      `Processing case ${sourceCase.id}`
  );

  try {
    const extraction =
      await extractWithRetry(sourceCase);

    const record = createProcessedRecord(
      sourceCase,
      extraction
    );

    recordsById.set(sourceCase.id, record);
    errorsById.delete(sourceCase.id);

    const zones = extraction.damages
      .map((damage) => damage.zone)
      .join(', ');

    console.log(
      `Success: ${extraction.caseType} / ` +
        `${extraction.caseKind}` +
        (zones ? ` / ${zones}` : '')
    );
  } catch (error) {
    failuresDuringRun += 1;

    const message = toErrorMessage(error);

    errorsById.set(sourceCase.id, {
      caseId: sourceCase.id,
      promptVersion,
      attempts: maxRetries,
      failedAt: new Date().toISOString(),
      error: message,
    });

    console.error(
      `Failed case ${sourceCase.id}: ${message}`
    );
  }

  // Save after every case so an interruption
  // does not lose completed API calls.
  await saveProgress();

  if (current < pendingCases.length) {
    await wait(delayMs);
  }
}

const completedRecords = Array.from(
  recordsById.values()
);

const serviceCount = completedRecords.filter(
  (record) =>
    record.extraction.caseType === 'service'
).length;

const damageCount = completedRecords.filter(
  (record) =>
    record.extraction.caseType === 'damage'
).length;

console.log('');
console.log('Extraction summary');
console.log('------------------');
console.log(`Successful: ${completedRecords.length}`);
console.log(`Service: ${serviceCount}`);
console.log(`Damage: ${damageCount}`);
console.log(`Failed in this run: ${failuresDuringRun}`);

console.log(
  `Remaining: ${
    sourceCases.length - completedRecords.length
  }`
);

console.log('');
console.log(`Results: ${outputPath}`);
console.log(`Errors: ${errorsPath}`);

if (failuresDuringRun > 0) {
  process.exitCode = 1;
}