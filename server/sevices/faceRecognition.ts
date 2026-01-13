
// @ts-ignore - Optional peer dependency
import * as tf from '@tensorflow/tfjs-core';
// @ts-ignore - Optional backend
import '@tensorflow/tfjs-backend-cpu';

// Polyfill TextEncoder/TextDecoder for Node environment
import { TextEncoder, TextDecoder } from 'util';
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// @ts-ignore
import * as faceapi from '@vladmandic/face-api/dist/face-api.js';
// @ts-ignore - Optional peer dependency
import canvas from 'canvas';
import path from 'path';
// @ts-ignore - Optional peer dependency
import sharp from 'sharp';

// @ts-ignore
const { Canvas, Image, ImageData } = canvas;

console.log("Global TextEncoder defined?", !!(global as any).TextEncoder);

// Monkey patch for Node.js environment
// @ts-ignore
faceapi.env.monkeyPatch({
    Canvas,
    Image,
    ImageData,
    TextEncoder: (global as any).TextEncoder,
    TextDecoder: (global as any).TextDecoder,
});

const MODELS_PATH = path.join(__dirname, '../weights');

let modelsLoaded = false;

export const loadModels = async () => {
    if (modelsLoaded) return;
    try {
        console.log("Loading FaceAPI models...");
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH);
        modelsLoaded = true;
        console.log("✅ FaceAPI models loaded");
    } catch (error) {
        console.error("Error loading FaceAPI models:", error);
        throw error;
    }
};

export async function optimizeBase64Image(base64: string) {
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const optimized = await sharp(buffer)
        .resize(320, 320)
        .jpeg({ quality: 60 })
        .toBuffer();

    return optimized;
}

export function basicAntiSpoofCheck(detection: any) {
    if (!detection) {
        throw new Error("No face detected");
    }

    if (detection.detection && detection.detection.score < 0.4) {
        throw new Error(`Face confidence too low (${(detection.detection.score * 100).toFixed(0)}%). Please provide a clearer photo.`);
    }
}

export const getFaceEmbedding = async (imageBuffer: Buffer | string): Promise<Float32Array | null> => {
    await loadModels();
    try {
        let buffer: Buffer;
        if (typeof imageBuffer === 'string') {
            buffer = await optimizeBase64Image(imageBuffer);
        } else {
            buffer = await sharp(imageBuffer)
                .resize(320, 320)
                .jpeg({ quality: 60 })
                .toBuffer();
        }

        const img = await canvas.loadImage(buffer);

        const detection = await faceapi
            .detectSingleFace(img as any)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) return null;

        basicAntiSpoofCheck(detection);

        return detection.descriptor;
    } catch (error) {
        console.error("Error generating embedding:", error);
        return null; // Return null to indicate failure
    }
};

export const calculateSimilarity = (embedding1: number[], embedding2: number[]): number => {
    if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
        return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < embedding1.length; i++) {
        dotProduct += embedding1[i] * embedding2[i];
        normA += embedding1[i] * embedding1[i];
        normB += embedding2[i] * embedding2[i];
    }

    if (normA === 0 || normB === 0) return 0;

    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));

    return Math.max(0, similarity * 100);
};
