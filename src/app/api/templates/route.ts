import { NextResponse } from 'next/server';
import { getTemplates, getTemplatesByCategory } from '@/services/templates';

// GET - List all monitor templates
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const grouped = searchParams.get('grouped') === 'true';

    if (grouped) {
      return NextResponse.json(getTemplatesByCategory());
    }

    return NextResponse.json(getTemplates());
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch templates', details: (error as Error).message },
      { status: 500 }
    );
  }
}
