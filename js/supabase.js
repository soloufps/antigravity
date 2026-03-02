// Supabase Initialization
// Reemplaza estos valores con los de tu proyecto en Supabase
const SUPABASE_URL = 'https://vvychuxlfqispeafymld.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2eWNodXhsZnFpc3BlYWZ5bWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDAwNjMsImV4cCI6MjA4Nzc3NjA2M30.a21_8mSSkfYQel9Dl8m7V8EMI6i8-vZ6Z8oaBTR069Q';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabaseClient;
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
console.log('Supabase initialized');
