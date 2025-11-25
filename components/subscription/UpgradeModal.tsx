'use client';

import { useRouter } from 'next/navigation';
import { Sparkles, X } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  message?: string;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  featureName,
  message,
}: UpgradeModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const displayMessage = message || `Upgrade to unlock ${featureName} and more story options.`;

  const handleUpgrade = () => {
    router.push('/pricing');
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 max-w-sm w-full animate-scale-in shadow-2xl relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors hover:bg-gray-100"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Header */}
        <h3 className="text-xl md:text-2xl font-display font-bold text-gray-900 text-center mb-3">
          Unlock {featureName}
        </h3>

        {/* Message */}
        <p className="text-base text-gray-600 text-center mb-6">
          {displayMessage}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="btn btn-secondary btn-md flex-1"
          >
            Cancel
          </button>
          <button
            onClick={handleUpgrade}
            className="btn btn-primary btn-md flex-1"
          >
            Upgrade
          </button>
        </div>
      </div>
    </div>
  );
}
