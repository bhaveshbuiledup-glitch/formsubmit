import test from 'node:test';
import assert from 'node:assert/strict';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const namePattern = /^[A-Z][A-Za-z]*(?:[ '-][A-Za-z]+)*$/;
const phonePattern = /^\d{1,19}$/;

test('validation patterns accept valid email and phone values', () => {
  assert.equal(namePattern.test('Ada Lovelace'), true);
  assert.equal(emailPattern.test('person@example.com'), true);
  assert.equal(phonePattern.test('1234567890123456789'), true);
});

test('validation patterns reject malformed contact values', () => {
  assert.equal(namePattern.test('ada Lovelace'), false);
  assert.equal(emailPattern.test('person@example'), false);
  assert.equal(phonePattern.test('12345678901234567890'), false);
});
