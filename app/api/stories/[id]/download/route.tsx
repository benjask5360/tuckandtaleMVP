import React from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { renderToStream } from '@react-pdf/renderer';
import { StoryPDFTemplate } from '@/lib/pdf/story-pdf-template';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const storyId = params.id;

    // Fetch story from content table (V3 stories)
    const { data: story, error: storyError } = await supabase
      .from('content')
      .select('*')
      .eq('id', storyId)
      .eq('user_id', user.id)
      .single();

    if (storyError || !story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    // Transform the data to match PDF template expectations
    const pdfStory = {
      ...story,
      // Ensure body is set correctly
      body: story.body || story.generation_metadata?.paragraphs?.join('\n\n') || '',
      // Extract moral from generation_metadata if it exists
      moral: story.generation_metadata?.moral,
    };

    // Generate PDF
    const pdfStream = await renderToStream(
      <StoryPDFTemplate story={pdfStory} />
    );

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of pdfStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    // Create a safe filename
    const safeTitle = story.title
      .replace(/[^a-z0-9]/gi, '-')
      .replace(/-+/g, '-')
      .toLowerCase()
      .substring(0, 50);
    const date = new Date(story.created_at).toISOString().split('T')[0];
    const filename = `${safeTitle}-${date}.pdf`;

    // Return PDF as download
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
