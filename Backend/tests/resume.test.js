const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const blacklist = require('../src/models/blacklist.model');
const app = require('../src/app');

const { makePdf } = require('../test-support/pdf');

let server, base, cookie;
const originalFindOne = blacklist.findOne;
const originalSecret = process.env.JWT_SECRET;
before(async () => {
    process.env.JWT_SECRET = 'test-only-secret-not-for-deployment';
    blacklist.findOne = async () => null; // No live database required.
    cookie = `token=${jwt.sign({id:'test-user'}, process.env.JWT_SECRET)}`;
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
    blacklist.findOne = originalFindOne;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    await new Promise(resolve => server.close(resolve));
});
async function upload(bytes, {name='resume.pdf', type='application/pdf', field='resume', authenticated=true} = {}) {
    const body = new FormData();
    if (bytes !== null) body.append(field, new Blob([bytes], {type}), name);
    return fetch(`${base}/resumes`, {method:'POST', body, headers: authenticated ? {Cookie:cookie} : {}});
}

test('requires authentication before accepting files', async () => {
    assert.equal((await upload(makePdf('Node developer'), {authenticated:false})).status, 401);
});
test('extracts a real PDF without persisting it', async () => {
    const response = await upload(makePdf('Backend developer with Node.js experience'));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.match(body.resume.text, /Backend developer/);
    assert.equal(body.resume.pageCount, 1);
    assert.equal(body.saved, false);
    assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('rejects absent and empty uploads', async () => {
    assert.equal((await upload(null)).status, 400);
    assert.equal((await upload(Buffer.alloc(0))).status, 400);
});
test('rejects a non-PDF name, MIME type, or header', async () => {
    assert.equal((await upload(makePdf('Hello'), {name:'resume.txt'})).status, 415);
    assert.equal((await upload(makePdf('Hello'), {type:'text/plain'})).status, 415);
    assert.equal((await upload(Buffer.from('not a pdf'))).status, 415);
});
test('rejects damaged and text-free PDFs', async () => {
    assert.equal((await upload(Buffer.from('%PDF-1.4\nbroken'))).status, 422);
    const response = await upload(makePdf());
    assert.equal(response.status, 422);
    assert.match((await response.json()).message, /No readable text/);
});
test('rejects files over 3 MB and wrong field names', async () => {
    assert.equal((await upload(Buffer.alloc(3 * 1024 * 1024 + 1))).status, 413);
    assert.equal((await upload(makePdf('Hello'), {field:'document'})).status, 400);
});
