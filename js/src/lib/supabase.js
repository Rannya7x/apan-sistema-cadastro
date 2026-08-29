import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://jaslvoxljchhhkompelu.supabase.co';
const supabasePublicKey = 'sb_publishable_3tXI8XXFLpEx_JVqBHK7TQ_QnFzKlMP';

export const supabase = createClient(supabaseUrl, supabasePublicKey, {
  auth: {
    storage: window.sessionStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
