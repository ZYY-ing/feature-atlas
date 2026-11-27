import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {exportReview} from '../tools/export-review.mjs';
test('offline review contains pinned full sources, notes UI, license, and valid self-contained JavaScript',()=>{
 exportReview('.scratch/review-check.html');
 const html=fs.readFileSync('.scratch/review-check.html','utf8');
 const code=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];assert.ok(code);
 assert.ok(!/^import /m.test(code));assert.ok(!html.includes('fonts.googleapis.com'));
 assert.match(code,/loadSource:async meta=>reviewSources\[meta.key\]/);
 assert.match(html,/third-party-license/);assert.match(html,/Apache License/);
 fs.writeFileSync('.scratch/review-main.mjs',code);
 const check=spawnSync(process.execPath,['--check','.scratch/review-main.mjs'],{encoding:'utf8'});assert.equal(check.status,0,check.stderr?.slice(0,1500));
});
