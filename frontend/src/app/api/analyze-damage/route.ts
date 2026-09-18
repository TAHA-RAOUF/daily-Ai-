import { z } from 'zod';
import { NextResponse } from 'next/server';

import { extractDamageCase } from 'src/lib/deepseek';

export const runtime = 'nodejs';

const requestSchema = z
  .object({
    caseId: z.number().int().positive(),

    freitext: z
      .string()
      .trim()
      .min(1, 'freitext is required')
      .max(10_000, 'freitext is too long'),
  })
  .strict();

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: 'Request body must be valid JSON.',
      },
      {
        status: 400,
      }
    );
  }

  const validation = requestSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Invalid request.',
        details: validation.error.flatten(),
      },
      {
        status: 400,
      }
    );
  }

  try {
    const result = await extractDamageCase(validation.data);

    return NextResponse.json(
      {
        data: result,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error('Damage extraction failed:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Unknown extraction error';

    return NextResponse.json(
      {
        error: 'Damage extraction failed.',
        details:
          process.env.NODE_ENV === 'development'
            ? message
            : undefined,
      },
      {
        status: 502,
      }
    );
  }
}