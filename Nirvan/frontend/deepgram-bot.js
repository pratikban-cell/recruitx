// deepgram-bot.js
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Load environment variables from .env.local
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
// Get Deepgram API Key from environment, .env.local, or direct fallback
const deepgramApiKey = process.env.DEEPGRAM_API_KEY || env.DEEPGRAM_API_KEY || "28f86de5838375a5c95fb1ba60954c4f477399a2";

// Parse command line arguments for optional Agent ID and target Meet URL
const args = process.argv.slice(2);
let agentId = null;
let cliMeetUrl = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--agent-id' && args[i + 1]) {
    agentId = args[i + 1];
    i++;
  } else if (args[i].includes('meet.google.com')) {
    cliMeetUrl = args[i];
  } else if (!args[i].startsWith('-')) {
    if (args[i].length === 40) {
      agentId = args[i];
    }
  }
}

// User provided Deepgram settings JSON base
const deepgramSettings = {
  "type": "Settings",
  "audio": {
    "input": {
      "encoding": "linear16",
      "sample_rate": 48000
    },
    "output": {
      "encoding": "linear16",
      "sample_rate": 24000,
      "container": "none"
    }
  }
};

// If agentId is provided, we use Reusable Agent Config; otherwise, we fall back to inline configuration
if (agentId) {
  console.log(`ℹ️ Using Reusable Agent Config (agent_id: ${agentId})`);
  deepgramSettings["agent_id"] = agentId;
} else {
  console.log('ℹ️ Using inline Agent Configuration');
  deepgramSettings["agent"] = {
    "speak": {
      "provider": {
        "type": "deepgram",
        "model": "aura-2-odysseus-en"
      }
    },
    "listen": {
      "provider": {
        "type": "deepgram",
        "version": "v2",
        "model": "flux-general-en"
      }
    },
    "think": {
      "provider": {
        "type": "google",
        "model": "gemini-3.1-flash-lite"
      },
      "prompt": "#Role\nYou are a general-purpose virtual assistant speaking to users over the phone. Your task is to help them find accurate, helpful information across a wide range of everyday topics.\n\n#General Guidelines\n-Be warm, friendly, and professional.\n-Speak clearly and naturally in plain language.\n-Keep most responses to 1-2 sentences and under 120 characters unless the caller asks for more detail (max: 300 characters).\n-Do not use markdown formatting, like code blocks, quotes, bold, links, or italics.\n-Use line breaks in lists.\n-Use varied phrasing; avoid repetition.\n-If unclear, ask for clarification.\n-If the user's message is empty, respond with an empty message.\n-If asked about your well-being, respond briefly and kindly.\n\n#Voice-Specific Instructions\n-Speak in a conversational tone-your responses will be spoken aloud.\n-Pause after questions to allow for replies.\n-Confirm what the customer said if uncertain.\n-Never interrupt.\n\n#Style\n-Use active listening cues.\n-Be warm and understanding, but concise.\n-Use simple words unless the caller uses technical terms.\n\n#Call Flow Objective\n-Greet the caller and introduce yourself:\n\"Hi there, I'm your virtual assistant-how can I help today?\"\n-Your primary goal is to help users quickly find the information they're looking for. This may include:\nQuick facts: \"The capital of Japan is Tokyo.\"\nWeather: \"It's currently 68 degrees and cloudy in Seattle.\"\nLocal info: \"There's a pharmacy nearby open until 9 PM.\"\nBasic how-to guidance: \"To restart your phone, hold the power button for 5 seconds.\"\nFAQs: \"Most returns are accepted within 30 days with a receipt.\"\nNavigation help: \"Can you tell me the address or place you're trying to reach?\"\n-If the request is unclear:\n\"Just to confirm, did you mean...?\" or \"Can you tell me a bit more?\"\n-If the request is out of scope (e.g. legal, financial, or medical advice):\n\"I'm not able to provide advice on that, but I can help you find someone who can.\"\n\n#Off-Scope Questions\n-If asked about sensitive topics like health, legal, or financial matters:\n\"I'm not qualified to answer that, but I recommend reaching out to a licensed professional.\"\n\n#User Considerations\n-Callers may be in a rush, distracted, or unsure how to phrase their question. Stay calm, helpful, and clear-especially when the user seems stressed, confused, or overwhelmed.\n\n#Closing\n-Always ask:\n\"Is there anything else I can help you with today?\"\n-Then thank them warmly and say:\n\"Thanks for calling. Take care and have a great day!\"\n"
    },
    "greeting": "Hello! How may I help you?"
  };
}

async function getLatestMeetLink() {
  const fallbackLink = 'https://meet.google.com/xyk-wi';
  if (!supabaseUrl || !supabaseAnonKey) {
    return fallbackLink;
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  try {
    const { data: negs } = await supabase
      .from('negotiations')
      .select('id')
      .eq('status', 'scheduled')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (!negs || negs.length === 0) return fallbackLink;

    const { data: messages } = await supabase
      .from('messages')
      .select('content')
      .eq('negotiation_id', negs[0].id)
      .eq('sender_role', 'system')
      .order('created_at', { ascending: false });

    if (!messages) return fallbackLink;

    for (const msg of messages) {
      const match = msg.content.match(/https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i);
      if (match) return match[0];
    }
  } catch (e) {
    console.error('Error fetching latest meet link:', e);
  }
  return fallbackLink;
}

(async () => {
  if (!deepgramApiKey) {
    console.error('❌ Error: DEEPGRAM_API_KEY environment variable is not defined.');
    console.log('Please set it using: $env:DEEPGRAM_API_KEY="your_api_key" (PowerShell) or add it to .env.local');
    process.exit(1);
  }

  const meetUrl = cliMeetUrl || await getLatestMeetLink();
  console.log(`📡 Target Google Meet: ${meetUrl}`);

  // 2. Open WebSocket connection to Deepgram Voice Agent API
  console.log('🔌 Connecting to Deepgram Voice Agent WebSocket...');
  const dgWs = new WebSocket('wss://agent.deepgram.com/v1/agent/converse', {
    headers: {
      'Authorization': `Token ${deepgramApiKey}`
    }
  });

  dgWs.onopen = () => {
    console.log('✅ Connected to Deepgram. Sending Settings payload...');
    dgWs.send(JSON.stringify(deepgramSettings));
  };

  dgWs.onerror = (err) => {
    console.error('❌ Deepgram WebSocket Error:', err);
  };

  dgWs.onclose = () => {
    console.log('🔌 Deepgram WebSocket Connection closed.');
  };

  // 3. Launch Chrome with Playwright
  console.log('🤖 Spawning Playwright browser...');
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ]
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Expose function for the browser to send captured human audio back to Node.js
  await page.exposeFunction('sendAudioToNode', (base64Audio) => {
    if (dgWs.readyState === WebSocket.OPEN) {
      const buffer = Buffer.from(base64Audio, 'base64');
      dgWs.send(buffer);
    }
  });

  // Receive agent's voice response from Deepgram and pipe it back to browser microphone stream
  dgWs.onmessage = async (event) => {
    if (typeof event.data === 'string') {
      const msg = JSON.parse(event.data);
      if (msg.type === 'SettingsApplied') {
        console.log('🎉 Deepgram successfully applied settings and initialized!');
      } else if (msg.type === 'UserStartedSpeaking') {
        console.log('🗣️ User started speaking...');
      } else if (msg.type === 'AgentStartedSpeaking') {
        console.log('🤖 Agent started responding...');
      }
    } else {
      // Binary data containing the linear16 PCM agent audio from Deepgram
      const arrayBuffer = await event.data.arrayBuffer();
      const pcmBuffer = Buffer.from(arrayBuffer);
      await page.evaluate((base64Audio) => {
        if (window.playBotAudio) {
          window.playBotAudio(base64Audio);
        }
      }, pcmBuffer.toString('base64'));
    }
  };

  // 4. Inject Google Meet WebRTC Audio Bridge BEFORE navigation
  console.log('⚙️ Injecting WebRTC audio capture & microphone spoofing scripts...');
  await page.addInitScript(() => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const destination = audioCtx.createMediaStreamDestination();

    // Browser play function: Takes base64 PCM audio from Node/Deepgram and plays it into Meet's fake mic stream
    window.playBotAudio = (base64Audio) => {
      const raw = atob(base64Audio);
      const pcm = new Int16Array(raw.length / 2);
      for (let i = 0; i < pcm.length; i++) {
        pcm[i] = (raw.charCodeAt(i * 2) & 0xFF) | (raw.charCodeAt(i * 2 + 1) << 8);
      }
      
      const float32 = new Float32Array(pcm.length);
      for (let i = 0; i < pcm.length; i++) {
        float32[i] = pcm[i] / 32768.0;
      }
      
      const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);
      
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(destination);
      source.start();
    };

    // Override getUserMedia to spoof Meet's microphone input
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      if (constraints && constraints.audio) {
        console.log('🎤 Google Meet requested audio. Intercepting and feeding mock microphone track!');
        return destination.stream;
      }
      return originalGetUserMedia(constraints);
    };

    // Intercept incoming WebRTC streams to capture human voices in the meeting
    function captureTrack(track, stream) {
      if (!stream) stream = new MediaStream([track]);
      console.log('🔊 Hooked remote participant audio track. Streaming to Deepgram...');

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      
      source.connect(processor);
      processor.connect(audioCtx.destination);
      
      processor.onaudioprocess = (e) => {
        const inputBuffer = e.inputBuffer.getChannelData(0);
        const l16 = new Int16Array(inputBuffer.length);
        for (let i = 0; i < inputBuffer.length; i++) {
          l16[i] = Math.min(1, Math.max(-1, inputBuffer[i])) * 0x7FFF;
        }
        
        // Convert to base64 binary safely
        let binary = '';
        const bytes = new Uint8Array(l16.buffer);
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        window.sendAudioToNode(btoa(binary));
      };
    }

    // Wrap RTCPeerConnection to automatically detect remote participant tracks
    const originalOnTrack = RTCPeerConnection.prototype.ontrack;
    Object.defineProperty(RTCPeerConnection.prototype, 'ontrack', {
      set(fn) {
        this._ontrack = (event) => {
          if (event.track && event.track.kind === 'audio') {
            captureTrack(event.track, event.streams[0]);
          }
          return fn ? fn.call(this, event) : null;
        };
      },
      get() {
        return this._ontrack;
      }
    });

    const originalAddEventListener = RTCPeerConnection.prototype.addEventListener;
    RTCPeerConnection.prototype.addEventListener = function(type, listener, options) {
      if (type === 'track') {
        const wrappedListener = (event) => {
          if (event.track && event.track.kind === 'audio') {
            captureTrack(event.track, event.streams[0]);
          }
          listener.call(this, event);
        };
        return originalAddEventListener.call(this, type, wrappedListener, options);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });

  // Navigate to Google Meet room
  console.log(`🌐 Navigating browser to Google Meet: ${meetUrl}`);
  await page.goto(meetUrl);

  // Enter Meet UI
  try {
    console.log('✍️ Typing guest name...');
    await page.fill('input[placeholder*="name"], input[type="text"]', 'Nirvan Agent');
    console.log('🚪 Requesting to join the Meet call...');
    await page.click('button:has-text("Ask to join"), button:has-text("Join")');
  } catch (err) {
    console.error('⚠️ Navigation warning:', err.message);
  }
})();
