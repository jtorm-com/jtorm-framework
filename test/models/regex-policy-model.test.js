'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormRegexPolicyModel: r } = require('../../src/models/regex-policy-model/src/regex-policy-model.js');

test('validate accepts the bounded shipped grammar', () => {
  const patterns = [
    '^yes$',
    '^[0-9]+$',
    '^([0-9]+x[0-9]+)|(any)$',
    '^(?!ListItem$).+',
    '^https?://schema[.]org/(InStock|OutOfStock)$'
  ];

  for (const p of patterns)
    assert.equal(r.validate(p), 1, p)
  ;

  assert.equal(r.validate('^' + 'a'.repeat(254) + '$'), 1);
});

test('validate rejects unsupported and ambiguous regex constructs', () => {
  const patterns = [
    '',
    '^(x+)+$',
    '^(x|xx)+$',
    '^a*$',
    '^a{1,2}$',
    '^(?:a)$',
    '^(?=a)a$',
    '^(?!Other$).+',
    '^(a)\\1$',
    '^\\d+$',
    '^[ab]$',
    '^[9-0]$',
    '^[\\x41]$',
    '^a?b?c?$',
    '^[0-9]+[0-9]+$',
    '^[\\x0A\\x0D\\u2028\\u2029]+Z',
    '.+Z',
    '^a|.+Z',
    '^(((a)))$',
    '^' + 'a'.repeat(255) + '$'
  ];

  for (const p of patterns)
    assert.throws(() => r.validate(p), /Unsafe regex pattern/, p)
  ;

  assert.throws(() => r.validate(null), /Unsafe regex pattern/);
});

test('test validates its own pattern and bounds the subject before matching', () => {
  assert.equal(r.test('^[0-9]+$', '1'.repeat(1024)), true);
  assert.equal(r.test('^[0-9]+$', '12px'), false);
  assert.throws(() => r.test('^[0-9]+$', '1'.repeat(1025)), /Unsafe regex input/);
  assert.throws(() => r.test('^(x+)+$', 'x!'), /Unsafe regex pattern/);
});
