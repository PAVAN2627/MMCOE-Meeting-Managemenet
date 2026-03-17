// Test script to verify Deepgram and Gemini API keys
// Run with: node test-apis.js
// Requires: npm install dotenv  (or bun add dotenv)

import 'dotenv/config';

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;
const DEEPGRAM_API_KEY = process.env.VITE_DEEPGRAM_API_KEY;

if (!GEMINI_API_KEY || !DEEPGRAM_API_KEY) {
  console.error("❌ Missing keys in .env — make sure VITE_GEMINI_API_KEY and VITE_DEEPGRAM_API_KEY are set.");
  process.exit(1);
}

console.log("🧪 Testing API Keys...\n");

// Test 1: Gemini API
async function testGemini() {
  console.log("1️⃣ Testing Gemini API...");
  
  // First, try to list available models
  console.log("\n   Checking available models...");
  try {
    const listResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`,
      { method: 'GET' }
    );
    
    if (listResponse.ok) {
      const data = await listResponse.json();
      console.log(`   ✅ API Key is valid!`);
      console.log(`   Available models:`);
      data.models?.slice(0, 5).forEach(model => {
        console.log(`      - ${model.name}`);
      });
      
      // Try the first available model
      if (data.models && data.models.length > 0) {
        const firstModel = data.models[0].name.replace('models/', '');
        console.log(`\n   Testing with model: ${firstModel}`);
        
        const testEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${firstModel}:generateContent?key=${GEMINI_API_KEY}`;
        const testResponse = await fetch(testEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: "Extract tasks from this: 'John will make a report by tomorrow'. Return JSON: [{\"title\":\"task\",\"description\":\"desc\",\"priority\":\"high\"}]"
              }]
            }]
          })
        });
        
        if (testResponse.ok) {
          console.log(`   ✅ SUCCESS! Model ${firstModel} is working`);
          return { success: true, model: firstModel, endpoint: testEndpoint };
        }
      }
    } else {
      const error = await listResponse.text();
      console.log(`   ❌ API Key is INVALID or EXPIRED`);
      console.log(`   Error: ${error.substring(0, 150)}`);
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
  }
  
  return { success: false };
}

// Test 2: Deepgram API
async function testDeepgram() {
  console.log("\n2️⃣ Testing Deepgram API...");
  
  try {
    // Test with a simple API call to check authentication
    const response = await fetch('https://api.deepgram.com/v1/projects', {
      method: 'GET',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
      }
    });

    console.log(`   Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ SUCCESS! Deepgram API key is valid`);
      console.log(`   Projects:`, data.projects?.length || 0);
      return { success: true };
    } else {
      const error = await response.text();
      console.log(`   ❌ FAILED: ${error.substring(0, 100)}`);
      return { success: false, error };
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Run tests
async function runTests() {
  const geminiResult = await testGemini();
  const deepgramResult = await testDeepgram();

  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST RESULTS:");
  console.log("=".repeat(60));
  
  if (geminiResult.success) {
    console.log(`✅ Gemini API: WORKING`);
    console.log(`   Model: ${geminiResult.model}`);
    console.log(`   Endpoint: ${geminiResult.endpoint}`);
  } else {
    console.log(`❌ Gemini API: NOT WORKING`);
    console.log(`   Action: Check API key or try different model`);
  }

  if (deepgramResult.success) {
    console.log(`✅ Deepgram API: WORKING`);
  } else {
    console.log(`❌ Deepgram API: NOT WORKING`);
    console.log(`   Action: Check API key`);
  }

  console.log("=".repeat(60));
  
  if (geminiResult.success && deepgramResult.success) {
    console.log("\n🎉 All APIs are working! You're good to go!");
  } else {
    console.log("\n⚠️  Some APIs are not working. Please check the errors above.");
  }
}

runTests().catch(console.error);
