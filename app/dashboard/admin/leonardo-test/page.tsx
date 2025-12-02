'use client';

import { useState } from 'react';
import { Loader2, Sparkles, Clock, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';

interface TestResult {
  success: boolean;
  imageUrl?: string;
  generationId?: string;
  timings: {
    requestStart: number;
    requestEnd: number;
    pollingStart: number;
    pollingEnd: number;
    totalDuration: number;
    requestDuration: number;
    pollingDuration: number;
  };
  creditCost?: number;
  error?: string;
}

export default function LeonardoTestPage() {
  const [prompt, setPrompt] = useState('A friendly golden retriever puppy playing in a sunny meadow, children\'s book illustration style, warm colors, soft lighting');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/leonardo-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({
          success: false,
          error: data.error || 'Unknown error',
          timings: {
            requestStart: 0,
            requestEnd: 0,
            pollingStart: 0,
            pollingEnd: 0,
            totalDuration: 0,
            requestDuration: 0,
            pollingDuration: 0,
          },
        });
        return;
      }

      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        timings: {
          requestStart: 0,
          requestEnd: 0,
          pollingStart: 0,
          pollingEnd: 0,
          totalDuration: 0,
          requestDuration: 0,
          pollingDuration: 0,
        },
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Leonardo API Tester</h1>
          </div>
          <p className="text-gray-600">
            Test Leonardo API directly with story illustration config. Benchmark timing and performance.
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-soft mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Illustration Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
            placeholder="Enter your prompt here..."
            disabled={isGenerating}
          />

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="mt-4 w-full bg-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Image
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            {/* Timing Metrics */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-soft">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Performance Metrics</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="text-sm text-blue-600 font-medium mb-1">Request Duration</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {(result.timings.requestDuration / 1000).toFixed(2)}s
                  </div>
                  <div className="text-xs text-blue-500 mt-1">Time to get generation ID</div>
                </div>

                <div className="bg-green-50 rounded-xl p-4">
                  <div className="text-sm text-green-600 font-medium mb-1">Polling Duration</div>
                  <div className="text-2xl font-bold text-green-900">
                    {(result.timings.pollingDuration / 1000).toFixed(2)}s
                  </div>
                  <div className="text-xs text-green-500 mt-1">Time until image ready</div>
                </div>

                <div className="bg-purple-50 rounded-xl p-4">
                  <div className="text-sm text-purple-600 font-medium mb-1">Total Duration</div>
                  <div className="text-2xl font-bold text-purple-900">
                    {(result.timings.totalDuration / 1000).toFixed(2)}s
                  </div>
                  <div className="text-xs text-purple-500 mt-1">End-to-end time</div>
                </div>
              </div>

              {result.creditCost && (
                <div className="mt-4 p-4 bg-orange-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-900">
                      API Credits Used: {result.creditCost}
                    </span>
                  </div>
                </div>
              )}

              {result.generationId && (
                <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500 mb-1">Generation ID</div>
                  <code className="text-xs text-gray-700 font-mono">{result.generationId}</code>
                </div>
              )}
            </div>

            {/* Image Result */}
            {result.success && result.imageUrl ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-soft">
                <div className="flex items-center gap-2 mb-4">
                  <Check className="w-5 h-5 text-green-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Generated Image</h2>
                </div>
                <div className="flex justify-center">
                  <img
                    src={result.imageUrl}
                    alt="Generated illustration"
                    className="rounded-xl shadow-lg max-w-full h-auto"
                  />
                </div>
              </div>
            ) : result.error ? (
              <div className="bg-white border border-red-200 rounded-2xl p-6 shadow-soft">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h2 className="text-xl font-semibold text-red-900">Error</h2>
                </div>
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-red-700 font-mono text-sm">{result.error}</p>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Loading State */}
        {isGenerating && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-soft">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                <Sparkles className="w-6 h-6 text-purple-600 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <p className="text-gray-600 font-medium">Generating your illustration...</p>
              <p className="text-gray-400 text-sm">This typically takes 10-30 seconds</p>
            </div>
          </div>
        )}

        {/* Back Link */}
        <div className="mt-8">
          <a
            href="/dashboard/admin"
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
          >
            ← Back to Admin Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
