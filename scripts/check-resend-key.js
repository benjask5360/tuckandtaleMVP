require('dotenv').config({ path: '.env.local' });

console.log('Checking Resend API configuration...\n');

if (process.env.RESEND_API_KEY) {
  console.log('✅ RESEND_API_KEY is configured');
  console.log(`   Key starts with: ${process.env.RESEND_API_KEY.substring(0, 7)}...`);
} else {
  console.log('❌ RESEND_API_KEY is NOT configured in .env.local');
  console.log('   Please add it to proceed with email functionality');
}
