require('dotenv').config({path:'.env.local'});
const hasPassword = !!process.env.SUPABASE_DB_PASSWORD;
const length = process.env.SUPABASE_DB_PASSWORD ? process.env.SUPABASE_DB_PASSWORD.length : 0;
console.log('Password exists:', hasPassword, 'Length:', length);
