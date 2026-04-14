import { helloFlow } from '../src/lib/genkit.js';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log('Running helloFlow...');
  try {
    const result = await helloFlow('CineHub Test');
    console.log('Result:', result);
  } catch (err) {
    console.error('Flow failed:', err);
  }
}

run();
