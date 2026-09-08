import test from 'node:test';
import assert from 'node:assert/strict';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const namePattern = /^[A-Z][A-Za-z]*(?:[ '-][A-Za-z]+)*$/;
const phonePattern = /^\d{10}$/;

test('validation patterns accept valid email and phone values', () => {
  assert.equal(namePattern.test('Ada Lovelace'), true);
  assert.equal(emailPattern.test('person@example.com'), true);
  assert.equal(phonePattern.test('5551234567'), true);
});

test('validation patterns reject malformed contact values', () => {
  assert.equal(namePattern.test('ada Lovelace'), false);
  assert.equal(emailPattern.test('person@example'), false);
  assert.equal(phonePattern.test('+15551234567'), false);
});
