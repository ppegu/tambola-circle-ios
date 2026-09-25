const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = __dirname;
const json = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const groups = json('gallery-data.json');
const prompts = json('prompts.json');
const fixture = json('ticket-fixture.json');
assert.equal(groups.length, 9);
assert.equal(groups.reduce((n,g) => n+g.screens.length, 0), 36);
assert.equal(prompts.boards.length, 9);
assert.equal(fixture.panels.length, 6);
let all = [];
for (const panel of fixture.panels) {
  assert.equal(panel.length, 3);
  for (const row of panel) {
    assert.equal(row.length, 9);
    assert.equal(row.filter(v => v !== null).length, 5);
  }
  const numbers = panel.flat().filter(v => v !== null);
  assert.equal(numbers.length, 15);
  assert.equal(new Set(numbers).size, 15);
  for (let col=0; col<9; col++) {
    const values = panel.map(row => row[col]).filter(v => v !== null);
    assert.ok(values.length >= 1 && values.length <= 3);
    const low = col===0 ? 1 : col*10;
    const high = col===8 ? 90 : col*10+9;
    for (const value of values) assert.ok(Number.isInteger(value) && value >= low && value <= high);
    assert.deepEqual(values, [...values].sort((a,b)=>a-b));
  }
  all.push(...numbers);
}
assert.deepEqual([...all].sort((a,b)=>a-b), Array.from({length:90},(_,i)=>i+1));
const half = fixture.panels.slice(0,3).flat(2).filter(v=>v!==null);
assert.equal(half.length,45);
assert.equal(new Set(half).size,45);
const dimensions = [];
for (const group of groups) {
  const file = path.join(root,'images',group.file);
  const buf = fs.readFileSync(file);
  assert.equal(buf.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const width=buf.readUInt32BE(16),height=buf.readUInt32BE(20);
  assert.ok(width >= 1500 && height >= 900, group.file);
  dimensions.push({file:group.file,width,height});
}
const html = fs.readFileSync(path.join(root,'review.html'),'utf8');
assert.ok(html.includes('<title>Tambola Circle'));
const ids = [...html.matchAll(/data-screen="(\d+)"/g)].map(m=>Number(m[1]));
assert.equal(ids.length,72);
assert.deepEqual([...new Set(ids)].sort((a,b)=>a-b),Array.from({length:36},(_,i)=>i));
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,1);
new vm.Script(scripts[0][1],{filename:'review.html inline script'});
for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
  const target=match[1];
  if (/^(?:https?:|#)/.test(target)) continue;
  assert.ok(fs.existsSync(path.resolve(root,target.split('#')[0])), 'Missing gallery link '+target);
}
for (const file of fs.readdirSync(root).filter(f=>f.endsWith('.md'))) {
  const text=fs.readFileSync(path.join(root,file),'utf8');
  for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
    const target=match[1];
    if (/^(?:https?:|#)/.test(target)) continue;
    assert.ok(fs.existsSync(path.resolve(root,target.split('#')[0])),file+': Missing link '+target);
  }
}
json('atlas-evidence.json');
const rules = fs.readFileSync(path.join(root,'RULES_AND_TIMERS.md'),'utf8');
for(const phrase of ['readyWindowSeconds | 120','reviewWindowSeconds | 120','approved_by_timeout','proof_accepted_by_timeout','authorityEpoch','without a winner']) assert.ok(rules.includes(phrase),phrase);
const plan=fs.readFileSync(path.join(root,'IMPLEMENTATION_PLAN.md'),'utf8');
assert.ok(plan.includes('no seven-day history TTL'));
assert.ok(plan.includes('server-mediated multiplayer'));
const legacy=path.resolve(root,'../online-play-design-v1/README.md');
assert.ok(fs.readFileSync(legacy,'utf8').includes('Superseded'));
console.log(JSON.stringify({status:'passed',boards:groups.length,screens:36,pngDimensions:dimensions,fixture:'6 valid panels, 90 unique numbers; Half contains 3 panels / 45 unique numbers',gallery:'72 navigation targets covering 36 unique screens; local links valid; JavaScript syntax valid',scope:'Static design-artifact verification only; browser/native/game runtime not tested'},null,2));
