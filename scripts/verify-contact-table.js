const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iolimejvugpcpnmruqww.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvbGltZWp2dWdwY3BubXJ1cXd3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM3NDA5NCwiZXhwIjoyMDc3OTUwMDk0fQ.ybv7KgWy0fdRTik1UkX3nAjdgLsBEExpLUrvnG2FRMA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTable() {
  console.log('Verifying contact_submissions table...\n');

  // Try to select from the table
  const { data, error, count } = await supabase
    .from('contact_submissions')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('❌ Error accessing table:', error.message);
    process.exit(1);
  }

  console.log('✅ contact_submissions table exists!');
  console.log(`📊 Current row count: ${count || 0}`);
  console.log('\n✓ Table is ready to receive contact form submissions!');
}

verifyTable();
