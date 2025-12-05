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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-2">Facebook Ad Preview</h1>
          <p className="text-gray-600">Test and refine your ad creative before launch</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Ad Preview - 4:5 Ratio */}
          <div className="bg-white rounded-3xl shadow-card p-8">
            <h2 className="text-2xl font-display font-semibold text-gray-900 mb-6">Ad Preview</h2>

            {/* Facebook Ad Container */}
            <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-lg">
              {/* Ad Header */}
              <div className="p-4 flex items-center gap-3 border-b border-gray-100">
                <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">T&T</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900">Tuck & Tale</p>
                  <p className="text-xs text-gray-500">Sponsored</p>
                </div>
              </div>

              {/* Ad Image - 4:5 Ratio (1080x1350) */}
              <div className="relative bg-gradient-to-br from-primary-50 via-sky-50 to-purple-50" style={{ paddingBottom: '125%' }}>
                <div className="absolute inset-0 flex flex-col items-center justify-between py-12 px-8">
                  {/* Top Section - Headline */}
                  <div className="text-center space-y-4">
                    <h3 className="text-4xl font-display font-bold text-gray-900 leading-tight">
                      Fewer Tantrums<br />
                      Start at Bedtime
                    </h3>
                    <p className="text-lg text-gray-700 max-w-sm mx-auto leading-relaxed">
                      Personalized stories that teach gentle hands and kind hearts
                    </p>
                  </div>

                  {/* Bottom Section - Character Image */}
                  <div className="relative w-full max-w-sm">
                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-white shadow-xl">
                      <Image
                        src="/images/Characters/Default_DisneyPixar_style_standing_lineup_featuring_four_full_2_38dba27c-6d6e-4cee-b12d-6808af542348_0.png"
                        alt="Personalized story characters"
                        fill
                        className="object-contain p-4"
                      />
                    </div>
                  </div>

                  {/* Bottom Text */}
                  <div className="text-center">
                    <p className="text-xl font-display font-semibold text-gray-900">
                      Personalized Stories Where<br />
                      <span className="text-primary-600">YOUR Child</span> is the Hero
                    </p>
                  </div>
                </div>
              </div>

              {/* Ad Copy */}
              <div className="p-5">
                <p className="text-sm text-gray-900 mb-3 leading-relaxed">
                  Transform bedtime into a powerful teaching moment. Stories personalized with your child&apos;s name that teach kindness, sharing, and gentle hands. Every bedtime becomes a moment they&apos;ll remember.
                </p>
                <p className="text-xs text-gray-500 mb-4">tuckandtale.com</p>

                {/* CTA Button */}
                <button className="w-full bg-gradient-primary text-white font-semibold py-3.5 rounded-xl shadow-button hover:shadow-button-hover transition-all duration-300">
                  Create Your Story
                </button>
              </div>
            </div>
          </div>

          {/* Ad Details */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-card p-8">
              <h2 className="text-2xl font-display font-semibold text-gray-900 mb-6">Ad Specifications</h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Format</label>
                  <p className="text-gray-900 text-base">4:5 Ratio (1080 x 1350 pixels)</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Headline</label>
                  <p className="text-gray-900 text-base">Fewer Tantrums Start at Bedtime</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Subheadline</label>
                  <p className="text-gray-900 text-base">
                    Personalized Stories Where YOUR Child is the Hero
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Primary Text</label>
                  <p className="text-gray-900 text-base leading-relaxed">
                    Transform bedtime into a powerful teaching moment. Stories personalized with your child&apos;s name that teach kindness, sharing, and gentle hands. Every bedtime becomes a moment they&apos;ll remember.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Call to Action</label>
                  <p className="text-gray-900 text-base">Create Your Story</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Destination</label>
                  <p className="text-gray-900 text-base">tuckandtale.com</p>
                </div>
              </div>
            </div>

            <div className="bg-primary-50 border border-primary-100 rounded-3xl shadow-soft p-8">
              <h3 className="font-display font-semibold text-gray-900 mb-4 text-lg">Best Practices</h3>
              <ul className="text-sm text-gray-700 space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 font-bold">•</span>
                  <span>Keep headline under 40 characters for maximum impact</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 font-bold">•</span>
                  <span>Primary text: 125 characters or less performs best on mobile</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 font-bold">•</span>
                  <span>Use warm, inviting visuals that show your product in action</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 font-bold">•</span>
                  <span>Clear, action-oriented CTA that creates urgency</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 font-bold">•</span>
                  <span>Test multiple variations to find what resonates</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-8">
          <a
            href="/dashboard/admin"
            className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-2 transition-colors"
          >
            ← Back to Admin Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
