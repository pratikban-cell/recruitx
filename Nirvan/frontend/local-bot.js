// local-bot.js
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Manually parse .env.local to load Supabase configurations without extra dependencies
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const index = trimmed.indexOf('=');
      if (index > 0) {
        const key = trimmed.substring(0, index).trim();
        const value = trimmed.substring(index + 1).trim();
        env[key] = value;
      }
    }
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function getLatestMeetLink() {
  const fallbackLink = 'https://meet.google.com/xyk-wi';
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase credentials not found in .env.local. Falling back to default link:', fallbackLink);
    return fallbackLink;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('📡 Fetching the most recently scheduled negotiation from database...');
  // Find the latest negotiation that has transitioned to 'scheduled' status
  const { data: negs, error: negError } = await supabase
    .from('negotiations')
    .select('id, updated_at')
    .eq('status', 'scheduled')
    .order('updated_at', { ascending: false })
    .limit(1);

  if (negError || !negs || negs.length === 0) {
    console.warn('⚠️ No scheduled negotiations found in database. Using default fallback:', fallbackLink);
    return fallbackLink;
  }

  const latestNegId = negs[0].id;
  console.log(`🔍 Found scheduled negotiation ID: ${latestNegId}. Fetching calendar meeting details...`);

  // Query the system messages for that negotiation to extract the Google Meet link
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('content')
    .eq('negotiation_id', latestNegId)
    .eq('sender_role', 'system')
    .order('created_at', { ascending: false });

  if (msgError || !messages || messages.length === 0) {
    console.warn('⚠️ No system messages found for scheduled negotiation. Using default fallback:', fallbackLink);
    return fallbackLink;
  }

  // Find the message containing the video meeting link
  let meetLink = null;
  const meetRegex = /https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i;
  
  for (const msg of messages) {
    const match = msg.content.match(meetRegex);
    if (match) {
      meetLink = match[0];
      break;
    }
  }

  if (meetLink) {
    console.log('✅ Successfully parsed dynamic Meet link:', meetLink);
    return meetLink;
  }

  console.warn('⚠️ Could not extract Google Meet link from system messages. Using default fallback:', fallbackLink);
  return fallbackLink;
}

(async () => {
  const targetUrl = await getLatestMeetLink();

  console.log(`🤖 Spawning Playwright AI Meeting Bot to join: ${targetUrl}...`);

  // Launch Chrome with mic/camera permissions pre-granted
  const browser = await chromium.launch({
    headless: false, // Set to false so you can watch the bot join live on screen!
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ]
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(targetUrl);

  try {
    // Fill in the bot name (Google Meet has an input field for guest names)
    console.log('✍️ Typing bot name...');
    await page.fill('input[placeholder*="name"], input[type="text"]', 'Nirvan AI Assistant');

    // Click the "Ask to join" or "Join" button
    console.log('🚪 Clicking Join button...');
    await page.click('button:has-text("Ask to join"), button:has-text("Join")');

    console.log("🟢 Joined the Google Meet room successfully! Capturing interview audio...");
  } catch (err) {
    console.error('❌ Failed to automate Google Meet interactions:', err.message);
  }

  // Keep the browser open for the duration of the interview
  // (In a production scenario, you would record audio/transcribe here)
})();
