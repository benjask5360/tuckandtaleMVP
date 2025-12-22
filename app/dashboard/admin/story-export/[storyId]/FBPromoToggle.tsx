'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface FBPromoToggleProps {
  storyId: string;
  initialFeatured: boolean;
  initialDisplayOrder: number;
}

export default function FBPromoToggle({ storyId, initialFeatured, initialDisplayOrder }: FBPromoToggleProps) {
  const [featured, setFeatured] = useState(initialFeatured);
  const [displayOrder, setDisplayOrder] = useState(initialDisplayOrder);
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    const newValue = !featured;
    setIsUpdating(true);

    try {
      const response = await fetch('/api/admin/toggle-fb-promo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyId,
          featured: newValue,
          displayOrder,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update feature status');
      }

      setFeatured(newValue);
      router.refresh();
    } catch (error) {
      console.error('Error toggling FB promo feature:', error);
      alert('Failed to update feature status. Please try again.');
      // Revert on error
      setFeatured(featured);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDisplayOrderChange = async (newOrder: number) => {
    setDisplayOrder(newOrder);
    setIsUpdating(true);

    try {
      const response = await fetch('/api/admin/toggle-fb-promo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyId,
          featured,
          displayOrder: newOrder,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update display order');
      }

      router.refresh();
    } catch (error) {
      console.error('Error updating display order:', error);
      alert('Failed to update display order. Please try again.');
      // Revert on error
      setDisplayOrder(displayOrder);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={featured}
            onChange={handleToggle}
            disabled={isUpdating}
            className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span className="text-sm font-medium text-blue-900">
            {isUpdating ? 'Updating...' : 'Feature on FB Promo Page'}
          </span>
        </label>
        {featured && (
          <span className="ml-auto text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
            ✓ Featured
          </span>
        )}
      </div>
      {featured && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-blue-900">Display Order:</label>
          <input
            type="number"
            value={displayOrder}
            onChange={(e) => handleDisplayOrderChange(parseInt(e.target.value) || 0)}
            disabled={isUpdating}
            min="0"
            className="w-20 px-3 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span className="text-xs text-blue-600">Lower numbers appear first</span>
        </div>
      )}
    </div>
  );
}
