import { createClient } from "@deepgram/sdk";
import dotenv from "dotenv";

dotenv.config();

/**
 * Deepgram API Validation Test
 * Tests the Deepgram SDK and API key without requiring external audio files
 */

const TEST_API_KEY = process.env.DEEPGRAM_API_KEY;

if (!TEST_API_KEY) {
  console.error('❌ DEEPGRAM_API_KEY not set in .env');
  process.exit(1);
}

console.log('🔍 Testing Deepgram SDK integration...\n');

const deepgram = createClient(TEST_API_KEY);

/**
 * Test 1: Validate API key by making a simple API call
 * This test sends minimal audio (silence) to verify authentication works
 */
async function testApiKeyValidation() {
  console.log('Test 1: API Key Validation');
  console.log('─'.repeat(50));

  try {
    // Create a silent audio buffer (16-bit PCM, 16kHz, 1 second)
    const silentBuffer = Buffer.alloc(32000, 0);

    const live = deepgram.listen.live({
      model: "nova-2",
      language: "en-US",
      encoding: "linear16",
      sample_rate: 16000,
      smart_format: true,
    });

    let transcriptReceived = false;
    let connectionOpened = false;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('⚠️  Test timed out (no response from Deepgram within 5 seconds)');
        console.log('   This may indicate network issues or API key problems.');
        live.finish();
        reject(new Error('Test timeout'));
      }, 5000);

      live.on("open", () => {
        connectionOpened = true;
        console.log('✅ Connection opened successfully (API key valid)');
        
        // Send silent audio
        live.send(silentBuffer);
        live.finish();
      });

      live.on("transcript", (data) => {
        transcriptReceived = true;
        console.log('✅ Transcript event received');
        console.log('   Response shape:', JSON.stringify(data, null, 2).substring(0, 300) + '...');
        
        // Validate expected structure
        if (data?.channel?.alternatives?.[0]) {
          console.log('✅ Response has expected shape: channel.alternatives[0]');
        }
      });

      live.on("close", () => {
        clearTimeout(timeout);
        if (connectionOpened) {
          console.log('✅ Connection closed cleanly');
          resolve({
            success: true,
            connectionOpened,
            transcriptReceived,
          });
        } else {
          reject(new Error('Connection failed to open'));
        }
      });

      live.on("error", (err) => {
        clearTimeout(timeout);
        console.error('❌ Deepgram error:', err.message);
        reject(err);
      });
    });
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

/**
 * Test 2: Validate WebSocket response structure
 * Ensures the SDK correctly parses Deepgram WebSocket responses
 */
async function testResponseStructure() {
  console.log('\nTest 2: Response Structure Validation');
  console.log('─'.repeat(50));

  try {
    const silentBuffer = Buffer.alloc(16000, 0); // 0.5 second of silence

    const live = deepgram.listen.live({
      model: "nova-2",
      language: "en-US",
      encoding: "linear16",
      sample_rate: 16000,
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        live.finish();
        reject(new Error('Test timeout'));
      }, 5000);

      live.on("open", () => {
        live.send(silentBuffer);
        live.finish();
      });

      live.on("transcript", (data) => {
        clearTimeout(timeout);
        
        try {
          // Validate structure
          if (!data?.channel?.alternatives) {
            throw new Error('Missing channel.alternatives in response');
          }
          
          if (!Array.isArray(data.channel.alternatives)) {
            throw new Error('channel.alternatives is not an array');
          }

          const transcript = data.channel.alternatives[0]?.transcript || '';
          console.log('✅ Response structure is valid');
          console.log(`   Transcript field present: ${transcript ? 'yes' : 'yes (empty)'}');
          console.log(`   is_final: ${data.is_final ?? 'not set'}`);

          resolve({ success: true, validStructure: true });
        } catch (error) {
          reject(error);
        }
      });

      live.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  let passed = 0;
  let failed = 0;

  try {
    console.log('\n' + '='.repeat(50));
    console.log('DEEPGRAM SDK TEST SUITE');
    console.log('='.repeat(50) + '\n');

    // Test 1
    try {
      await testApiKeyValidation();
      passed++;
      console.log('✅ Test 1 PASSED\n');
    } catch (error) {
      failed++;
      console.log(`❌ Test 1 FAILED: ${error.message}\n`);
    }

    // Test 2
    try {
      await testResponseStructure();
      passed++;
      console.log('✅ Test 2 PASSED\n');
    } catch (error) {
      failed++;
      console.log(`❌ Test 2 FAILED: ${error.message}\n`);
    }

    // Summary
    console.log('='.repeat(50));
    console.log(`RESULTS: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(50) + '\n');

    if (failed === 0) {
      console.log('🎉 All tests passed! Deepgram SDK is working correctly.');
      process.exit(0);
    } else {
      console.log('⚠️  Some tests failed. Check your API key and network connection.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
