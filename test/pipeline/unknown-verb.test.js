'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');

for (const verb of ['typo', 'constructor']) {
  test(`unknown verb ${verb} throws loud before visiting its children`, async () => {
    await assert.rejects(
      render(
        '<body><div class="a"><span>original</span></div></body>',
        `.a->${verb} { span->child${verb} { } }`,
        {}
      ),
      { name: 'Error', message: `Unknown method ${verb}` }
    );
  });
}

test('registered method aliases still resolve', async () => {
  const { body } = await render(
    '<body><p>x</p></body>',
    "p->a { n: 'data-x'; v: '1'; }",
    {}
  );
  assert.equal(body, '<p data-x="1">x</p>');
});

test('selector-only rules still render their children', async () => {
  const { body } = await render(
    '<body><div><span>original</span></div></body>',
    "div { span->inner { t: 'changed'; } }",
    {}
  );
  assert.equal(body, '<div><span>changed</span></div>');
});
