import { ai } from '../src/lib/genkit.js';
import * as dotenv from 'dotenv';
dotenv.config();

console.log('Testing Genkit initialization...');
console.log('Default Model:', (ai as any).options?.model);
process.exit(0);
