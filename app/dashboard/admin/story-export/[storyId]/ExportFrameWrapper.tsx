'use client';

import { useRouter } from 'next/navigation';
import ExportFrame from './ExportFrame';

interface Frame {
  type: 'cover' | 'scene';
  index?: number;
  imageUrl?: string;
  text?: string;
  title?: string;
}

interface ExportFrameWrapperProps {
  frame: Frame;
  frameNumber: number;
  canEdit: boolean;
  storyId: string;
}

export default function ExportFrameWrapper({ frame, frameNumber, canEdit, storyId }: ExportFrameWrapperProps) {
  const router = useRouter();

  const handleUpdate = async (type: 'title' | 'sceneText', value: string, sceneIndex?: number) => {
    const response = await fetch('/api/admin/story-export/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storyId,
        updateType: type,
        value,
        sceneIndex,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update');
    }

    // Refresh the page to get updated data
    router.refresh();
  };

  return (
    <ExportFrame
      frame={frame}
      frameNumber={frameNumber}
      canEdit={canEdit}
      storyId={storyId}
      onUpdate={handleUpdate}
    />
  );
}
