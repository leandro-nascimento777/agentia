import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '../../../infrastructure/dependency-container';
import { TravelRequest } from '../../../domain/entities/TravelRequest';

const RequestBodySchema = z.object({
  message: z.string().min(3).max(500),
  from: z.string().optional().default('api-user'),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const parsed = RequestBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload inválido', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const travelRequest = TravelRequest.create(parsed.data.message, parsed.data.from);
    const pdfBuffer = await container.travelApi.handleRequest(travelRequest);

    return NextResponse.json({
      success: true,
      pdf: pdfBuffer.toString('base64'),
      filename: `roteiro-${Date.now()}.pdf`,
      sizeBytes: pdfBuffer.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    console.error('[API /travel] Erro:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
