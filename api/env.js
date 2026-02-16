// Vercel Serverless Function - Returns Supabase config from env vars
export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  // Return Supabase configuration from environment variables
  res.json({
    url: process.env.SUPABASE_URL || null,
    key: process.env.SUPABASE_ANON_KEY || null,
    demo: !process.env.SUPABASE_URL // Fallback to demo if no env vars set
  });
}