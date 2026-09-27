import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { api, money, number } from '../src/api.js';

const originalFetch = globalThis.fetch;
afterEach(() => {globalThis.fetch = originalFetch;});

test('simulation requests carry JSON and surface field validation errors', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/simulations/run');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), {rounds: -1});
    return new Response(JSON.stringify({detail: [{loc: ['body', 'rounds'], msg: 'Must be positive'}]}), {status: 422});
  };
  await assert.rejects(api('/simulations/run', {rounds: -1}), /rounds: Must be positive/);
});

test('history deletion uses DELETE without a body and preserves server results', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/simulations/7');
    assert.equal(options.method, 'DELETE');
    assert.equal(options.body, undefined);
    return new Response(JSON.stringify({deleted: 7}));
  };
  assert.deepEqual(await api('/simulations/7', null, 'DELETE'), {deleted: 7});
});

test('offline and non-JSON server failures remain visible; undefined metrics are not zero', async () => {
  globalThis.fetch = async () => new Response('Bad gateway', {status: 502});
  await assert.rejects(api('/defaults'), /Request failed \(502\)/);
  globalThis.fetch = async () => {throw new Error('Network unavailable');};
  await assert.rejects(api('/defaults'), /Network unavailable/);
  assert.equal(number(null), 'N/A');
  assert.equal(money(null), 'N/A');
});
