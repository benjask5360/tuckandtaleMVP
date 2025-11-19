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

    // Fetch story with all related data
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select(`
        id,
        title,
        body,
        created_at,
        user_id,
        generation_metadata,
        story_illustrations,
        content_characters (
          character_profiles!inner (
            name
          )
        )
      `)
      .eq('id', storyId)
      .single();

    if (storyError || !story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    // Verify user owns this story
    if (story.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - you do not own this story' },
        { status: 403 }
      );
    }

    // Transform the data to match PDF template expectations
    const pdfStory = {
      ...story,
      content_characters: story.content_characters?.map((cc: any) => ({
        character_profiles: Array.isArray(cc.character_profiles)
          ? cc.character_profiles[0]
          : cc.character_profiles
      }))
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
