import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Image from 'next/image';

export default async function FacebookAdsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('user_type')
    .eq('id', user.id)
    .single();

  if (userProfile?.user_type !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Facebook Ad Preview</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Ad Preview - 4:5 Ratio */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Ad Preview</h2>

            {/* Facebook Ad Container */}
            <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-lg overflow-hidden shadow-md">
              {/* Ad Header */}
              <div className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">T&T</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900">Tuck & Tale</p>
                  <p className="text-xs text-gray-500">Sponsored</p>
                </div>
              </div>

              {/* Ad Image - 4:5 Ratio (1080x1350) */}
              <div className="relative gradient-bg-primary" style={{ paddingBottom: '125%' }}>
                <div className="absolute inset-0 flex flex-col items-center justify-between py-8 px-6">
                  <div className="text-center">
                    <h3 className="text-3xl font-display font-bold text-gray-900 mb-2 leading-tight">
                      Personalized Stories Where<br />
                      <span className="gradient-text">
                        YOUR Child
                      </span>{' '}
                      is the Hero
                    </h3>
                    <p className="text-base text-gray-600 leading-relaxed">
                      Personalized bedtime stories that teach gentle hands and kind hearts.
                    </p>
                  </div>

                  {/* Image Grid */}
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-white shadow-lg">
                      <Image
                        src="/images/hero.png"
                        alt="Story example 1"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-white shadow-lg">
                      <Image
                        src="/images/Characters/children.jpg"
                        alt="Story example 2"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ad Copy */}
              <div className="p-4">
                <p className="text-sm text-gray-900 mb-3">
                  Personalized bedtime stories that teach gentle hands and kind hearts. Every bedtime becomes a moment they&apos;ll remember.
                </p>
                <p className="text-xs text-gray-500 mb-3">tuckandtale.com</p>

                {/* CTA Button */}
                <button className="w-full bg-gradient-primary text-white font-semibold py-3 rounded-xl shadow-button hover:shadow-blue-glow transition-all">
                  Create Your Story
                </button>
              </div>
            </div>
          </div>

          {/* Ad Details */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Ad Specifications</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <p className="text-gray-900">4:5 Ratio (1080 x 1350 pixels)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
                <p className="text-gray-900">Personalized Stories Where YOUR Child is the Hero</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Text</label>
                <p className="text-gray-900">
                  Personalized bedtime stories that teach gentle hands and kind hearts. Every bedtime becomes a moment they&apos;ll remember.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Call to Action</label>
                <p className="text-gray-900">Create Your Story</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                <p className="text-gray-900">tuckandtale.com</p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Tips:</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Keep headline under 40 characters</li>
                <li>• Primary text: 125 characters or less performs best</li>
                <li>• Use eye-catching visuals in the 4:5 image</li>
                <li>• Clear, action-oriented CTA</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
