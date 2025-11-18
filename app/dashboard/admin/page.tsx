import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Shield, Users, FileText, BarChart3, Settings, Database } from 'lucide-react';

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/auth/login');
  }

  // Check if user is admin
  const { data: userProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('user_type, full_name')
    .eq('id', user.id)
    .single();

  if (profileError || userProfile?.user_type !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <p className="text-gray-600">
            Welcome back, {userProfile?.full_name?.split(' ')[0] || 'Admin'}. Manage your platform from here.
          </p>
        </div>

        {/* Placeholder Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Users Management */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-card transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Users</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Manage user accounts, subscriptions, and permissions.
            </p>
            <div className="text-sm text-gray-500 italic">Coming soon...</div>
          </div>

          {/* Content Management */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-card transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-50 rounded-xl">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Content</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Review and moderate user-generated stories and content.
            </p>
            <div className="text-sm text-gray-500 italic">Coming soon...</div>
          </div>

          {/* Analytics */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-card transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-50 rounded-xl">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Analytics</h2>
            </div>
            <p className="text-gray-600 mb-4">
              View platform metrics, usage statistics, and trends.
            </p>
            <div className="text-sm text-gray-500 italic">Coming soon...</div>
          </div>

          {/* System Settings */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-card transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-orange-50 rounded-xl">
                <Settings className="w-6 h-6 text-orange-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Configure platform settings, AI models, and system preferences.
            </p>
            <div className="text-sm text-gray-500 italic">Coming soon...</div>
          </div>

          {/* Database Management */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-card transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-50 rounded-xl">
                <Database className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Database</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Manage descriptors, AI configs, and pricing data.
            </p>
            <div className="text-sm text-gray-500 italic">Coming soon...</div>
          </div>

          {/* Support */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-card transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-cyan-50 rounded-xl">
                <Shield className="w-6 h-6 text-cyan-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Support</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Handle user inquiries, tickets, and support requests.
            </p>
            <div className="text-sm text-gray-500 italic">Coming soon...</div>
          </div>
        </div>

        {/* Back to Dashboard Link */}
        <div className="mt-8">
          <a
            href="/dashboard"
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
