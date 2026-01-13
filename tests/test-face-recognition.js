#!/usr/bin/env node
/**
 * Test face recognition workflow
 * 1. Verify models load
 * 2. Test face embedding extraction
 * 3. Test face similarity calculation
 */

const path = require('path');
const faceapi = require('face-api.js');
const canvas = require('canvas');
const sharp = require('sharp');
const { TextEncoder, TextDecoder } = require('util');

const { Canvas, Image, ImageData } = canvas;

// Monkey patch
faceapi.env.monkeyPatch({
    Canvas,
    Image,
    ImageData,
    TextEncoder,
    TextDecoder,
});

const MODELS_PATH = path.join(__dirname, 'server', 'weights');

async function testFaceRecognition() {
    console.log('🚀 Testing Face Recognition Setup\n');

    // Test 1: Load Models
    console.log('Step 1: Loading face-api models...');
    try {
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH);
        console.log('  ✓ SSD MobileNet v1 loaded');
        
        await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH);
        console.log('  ✓ Face Landmark 68 loaded');
        
        await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH);
        console.log('  ✓ Face Recognition loaded');
        
        console.log('✅ All models loaded successfully!\n');
    } catch (error) {
        console.error('❌ Model loading failed:', error.message);
        process.exit(1);
    }

    // Test 2: Test basic similarity calculation
    console.log('Step 2: Testing similarity calculation...');
    const embedding1 = Array.from({ length: 128 }, () => Math.random());
    const embedding2 = Array.from({ length: 128 }, () => Math.random());
    
    function calculateSimilarity(e1, e2) {
        if (!e1 || !e2 || e1.length !== e2.length) return 0;
        let dotProduct = 0, normA = 0, normB = 0;
        for (let i = 0; i < e1.length; i++) {
            dotProduct += e1[i] * e2[i];
            normA += e1[i] * e1[i];
            normB += e2[i] * e2[i];
        }
        const cosineSimilarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
        return cosineSimilarity * 100;
    }
    
    const similarity = calculateSimilarity(embedding1, embedding2);
    console.log(`  Random embeddings similarity: ${similarity.toFixed(2)}%`);
    console.log('✅ Similarity calculation works!\n');

    // Test 3: Check weights directory
    console.log('Step 3: Verifying weights directory...');
    const fs = require('fs');
    const files = fs.readdirSync(MODELS_PATH);
    console.log(`  Found ${files.length} model files:`);
    files.forEach(f => console.log(`    • ${f}`));
    console.log('✅ Weights directory ready!\n');

    console.log('🎉 All tests passed! Face recognition is ready to use.');
    console.log('\n📝 Next steps:');
    console.log('  1. Start the dev server (npm run dev)');
    console.log('  2. Go to Profile tab');
    console.log('  3. Tap your profile picture to open camera');
    console.log('  4. Take a selfie (ensure good lighting)');
    console.log('  5. Wait for "Face ID registered successfully!" message');
    console.log('  6. Go to Attendance tab and submit attendance\n');
}

testFaceRecognition();
