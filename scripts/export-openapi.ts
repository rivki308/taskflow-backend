/**
 * npm run openapi:export
 * Writes the OpenAPI document used by Swagger UI to docs/openapi.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { openApiDocument } from '../src/docs/openapi';

const target = path.join(__dirname, '..', 'docs', 'openapi.json');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${JSON.stringify(openApiDocument, null, 2)}\n`, 'utf8');
console.log(`[openapi] Written ${path.relative(process.cwd(), target)}`);
