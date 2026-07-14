'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { render } = require('../helpers/engine.js');
const { jTormLanguageModel } = require('../../src/models/language-model/src/language-model.js');

const XSS = '<img src=x onerror=alert(1)>';
const ESC = '&lt;img src=x onerror=alert(1)&gt;';
const AVAILABILITY_LABELS = [
    ['InStock', 'In stock'],
    ['OutOfStock', 'Out of stock'],
    ['BackOrder', 'Back order'],
    ['Discontinued', 'Discontinued'],
    ['InStoreOnly', 'In-store only'],
    ['LimitedAvailability', 'Limited availability'],
    ['MadeToOrder', 'Made to order'],
    ['OnlineOnly', 'Online only'],
    ['PreOrder', 'Pre-order'],
    ['PreSale', 'Pre-sale'],
    ['Reserved', 'Reserved'],
    ['SoldOut', 'Sold out']
];

function textContent(element) {
    return element.textContent.replace(/\s+/g, ' ').trim();
}

test('ui Product.default renders Product + nested Offer through the full SSR pipeline', async () => {
    const image = {
        '@id': '/product-image',
        '@type': 'ImageObject',
        contentUrl: 'https://e.com/widget.jpg',
        name: 'Widget image'
    };
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Product.default'; }",
        {
            '@type': 'Product',
            name: 'Secure widget',
            description: 'A useful widget.',
            image,
            sku: 'SKU-1',
            gtin: '0123456789012',
            brand: {
                '@type': 'Brand',
                name: 'Acme',
                url: 'https://e.com/acme'
            },
            offers: {
                '@type': 'Offer',
                price: '19.99',
                priceCurrency: 'EUR',
                availability: 'https://schema.org/InStock',
                url: 'https://e.com/widget'
            },
            url: 'https://e.com/widget'
        },
        'http://localhost/',
        { '/product-image': { json: image } }
    );

    const document = new JSDOM(`<body>${body}</body>`).window.document;

    assert.equal(body, '<div class="a"><section class="thing product"><div class="contents">'
        + '<header class="header"><h1><a href="https://e.com/widget">Secure widget</a></h1></header>'
        + '<div class="image"><figure><a href="https://e.com/widget.jpg"><picture>'
        + '<img alt="Widget image" src="https://e.com/widget.jpg"></picture></a></figure></div>'
        + '<section class="body"><div class="description">A useful widget.</div>'
        + '<span class="sku"> SKU: SKU-1</span><span class="gtin"> GTIN: 0123456789012</span>'
        + '<span class="product-brand"><a href="https://e.com/acme" title="Acme">'
        + '<span> Acme</span></a></span>'
        + '<div class="offer"><span class="price"> 19.99</span>'
        + '<span class="price-currency"> EUR</span>'
        + '<span class="availability"> In stock</span>'
        + '<a href="https://e.com/widget" class="offer-url"> Offer</a></div></section>'
        + '<footer class="footer"></footer></div></section></div>');
    assert.equal(
        textContent(document.querySelector('.body')),
        'A useful widget. SKU: SKU-1 GTIN: 0123456789012 Acme 19.99 EUR In stock Offer'
    );
});

test('ui Product.item renders the shared commerce card with an item variant hook', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Product.item'; }",
        {
            '@type': 'Product',
            name: 'Card widget',
            offers: {
                '@type': 'Offer',
                price: '7.50',
                priceCurrency: 'USD'
            },
            url: 'https://e.com/card'
        }
    );

    assert.equal(body, '<div class="a"><section class="thing product product-item"><div class="contents">'
        + '<header class="header"><h1><a href="https://e.com/card">Card widget</a></h1></header>'
        + '<section class="body"><div class="offer">'
        + '<span class="price"> 7.50</span><span class="price-currency"> USD</span>'
        + '</div></section><footer class="footer"></footer></div></section></div>');
});

test('ui Product.default renders multiple Offers in source order', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Product.default'; }",
        {
            '@type': 'Product',
            name: 'Multi-offer widget',
            offers: [
                { '@type': 'Offer', price: '1.00', priceCurrency: 'USD' },
                { '@type': 'Offer', price: '2.00', priceCurrency: 'EUR' }
            ]
        }
    );
    const offers = [...new JSDOM(`<body>${body}</body>`).window.document.querySelectorAll('.offer')];

    assert.equal(offers.length, 2);
    assert.deepEqual(offers.map(textContent), ['1.00 USD', '2.00 EUR']);
});

test('ui Product.default renders frozen Offers without mutating caller data', async () => {
    const offer = Object.freeze({ '@type': 'Offer', price: '3.00', priceCurrency: 'EUR' });
    const offers = Object.freeze([offer]);
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Product.default'; }",
        { '@type': 'Product', name: 'Frozen offer', offers }
    );
    const rendered = new JSDOM(`<body>${body}</body>`).window.document.querySelector('.offer');

    assert.equal(textContent(rendered), '3.00 EUR');
    assert.deepEqual(offer, { '@type': 'Offer', price: '3.00', priceCurrency: 'EUR' });
    assert.equal('isLoop' in offer, false);
    assert.equal('index' in offer, false);
});

test('ui Product.default renders a frozen Product without adding localized label state', async () => {
    const product = Object.freeze({
        '@type': 'Product',
        name: 'Frozen product',
        sku: 'SKU-2',
        gtin: '1234567890123'
    });
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Product.default'; }",
        product
    );
    const document = new JSDOM(`<body>${body}</body>`).window.document;

    assert.equal(textContent(document.querySelector('.sku')), 'SKU: SKU-2');
    assert.equal(textContent(document.querySelector('.gtin')), 'GTIN: 1234567890123');
    assert.deepEqual(product, {
        '@type': 'Product',
        name: 'Frozen product',
        sku: 'SKU-2',
        gtin: '1234567890123'
    });
    assert.equal('skuLabel' in product, false);
    assert.equal('gtinLabel' in product, false);
});

test('ui Product.default safely omits null Offer array entries', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Product.default'; }",
        {
            '@type': 'Product',
            name: 'Sparse offers',
            offers: [null, { '@type': 'Offer', price: '4.00', priceCurrency: 'USD' }]
        }
    );
    const offers = [...new JSDOM(`<body>${body}</body>`).window.document.querySelectorAll('.offer')];

    assert.equal(offers.length, 1);
    assert.equal(textContent(offers[0]), '4.00 USD');
});

test('ui Product.default omits every absent optional commerce field without stray markup', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Product.default'; }",
        { '@type': 'Product', name: 'Bare widget' }
    );

    assert.equal(body, '<div class="a"><section class="thing product"><div class="contents">'
        + '<header class="header"><h1><a>Bare widget</a></h1></header>'
        + '<section class="body"></section><footer class="footer"></footer></div></section></div>');
    assert.doesNotMatch(body, /product-brand|offer|sku|gtin|price|availability/);
});

test('ui Product.default renders Organization through the same schema.org brand shape', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Product.default'; }",
        {
            '@type': 'Product',
            name: 'Organization brand',
            brand: {
                '@type': 'Organization',
                name: 'Example Org',
                url: 'https://e.com/org'
            }
        }
    );

    assert.equal(body, '<div class="a"><section class="thing product"><div class="contents">'
        + '<header class="header"><h1><a>Organization brand</a></h1></header>'
        + '<section class="body"><span class="product-brand">'
        + '<a href="https://e.com/org" title="Example Org"><span> Example Org</span></a></span></section>'
        + '<footer class="footer"></footer></div></section></div>');
});

test('ui Product.default safely renders a linked Brand with quote and tag text', async () => {
    const name = '" onclick="alert(1)"><img src=x onerror=alert(2)>';
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Product.default'; }",
        {
            '@type': 'Product',
            name: 'Payload brand',
            brand: {
                '@type': 'Brand',
                name,
                url: 'https://e.com/payload-brand'
            }
        }
    );
    const document = new JSDOM(`<body>${body}</body>`).window.document;
    const link = document.querySelector('.product-brand a');

    assert.match(body, /&lt;img src=x onerror=alert\(2\)&gt;/);
    assert.equal(link.querySelector('span').textContent, ' ' + name);
    assert.equal(link.getAttribute('title'), name);
    assert.equal(link.getAttribute('onclick'), null);
    assert.equal(document.querySelector('img'), null);
});

test('ui Product.default renders a name-only brand as text instead of a link', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Product.default'; }",
        {
            '@type': 'Product',
            name: 'Text brand',
            brand: { '@type': 'Brand', name: 'Acme' }
        }
    );
    const brand = new JSDOM(`<body>${body}</body>`).window.document.querySelector('.product-brand');

    assert.equal(brand.tagName, 'SPAN');
    assert.equal(textContent(brand), 'Acme');
    assert.equal(brand.querySelector('a'), null);
});

test('ui Product.default does not reuse a Product href for a name-only brand', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Product.default'; }",
        {
            '@type': 'Product',
            name: 'Unrelated product link',
            href: 'https://e.com/product',
            brand: { '@type': 'Brand', name: 'Acme' }
        }
    );
    const brand = new JSDOM(`<body>${body}</body>`).window.document.querySelector('.product-brand');

    assert.equal(textContent(brand), 'Acme');
    assert.equal(brand.querySelector('a'), null);
    assert.equal(brand.querySelector('[href]'), null);
});

test('ui Product.default resolves SKU and GTIN labels through the language model', async t => {
    const get = jTormLanguageModel.get;
    jTormLanguageModel.get = function (value, locale) {
        if (value === 'SKU') return 'Stock code';
        if (value === 'GTIN') return 'Trade number';
        return get.call(this, value, locale);
    };
    t.after(() => { jTormLanguageModel.get = get; });

    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Product.default'; }",
        { '@type': 'Product', name: 'Translated labels', sku: 'A-1', gtin: '123' }
    );
    const document = new JSDOM(`<body>${body}</body>`).window.document;

    assert.equal(textContent(document.querySelector('.sku')), 'Stock code: A-1');
    assert.equal(textContent(document.querySelector('.gtin')), 'Trade number: 123');
});

test('ui Product.default omits a brand URL when no visible brand name exists', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Product.default'; }",
        {
            '@type': 'Product',
            name: 'Unnamed brand',
            brand: { '@type': 'Brand', url: 'https://e.com/no-name' }
        }
    );

    assert.equal(body, '<div class="a"><section class="thing product"><div class="contents">'
        + '<header class="header"><h1><a>Unnamed brand</a></h1></header>'
        + '<section class="body"></section><footer class="footer"></footer></div></section></div>');
    assert.doesNotMatch(body, /product-brand|https:\/\/e\.com\/no-name/);
});

test('ui Offer.default preserves numeric zero as a real price', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Offer.default'; }",
        { '@type': 'Offer', price: 0, priceCurrency: 'EUR' }
    );

    assert.equal(body, '<div class="a"><div class="offer"><span class="price"> 0</span>'
        + '<span class="price-currency"> EUR</span></div></div>');
});

test('ui Product.default preserves numeric zero in its nested Offer', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Product.default'; }",
        {
            '@type': 'Product',
            name: 'Free widget',
            offers: { '@type': 'Offer', price: 0, priceCurrency: 'EUR' }
        }
    );

    assert.equal(body, '<div class="a"><section class="thing product"><div class="contents">'
        + '<header class="header"><h1><a>Free widget</a></h1></header>'
        + '<section class="body"><div class="offer"><span class="price"> 0</span>'
        + '<span class="price-currency"> EUR</span></div></section>'
        + '<footer class="footer"></footer></div></section></div>');
});

test('ui Offer.default renders independently present optional fields', async () => {
    assert.equal(
        (await render(
            '<body><div class="a"></div></body>',
            ".a->ui { c: 'Offer.default'; }",
            { '@type': 'Offer', price: '5.00' }
        )).body,
        '<div class="a"><div class="offer"><span class="price"> 5.00</span></div></div>'
    );
    assert.equal(
        (await render(
            '<body><div class="a"></div></body>',
            ".a->ui { c: 'Offer.default'; }",
            {
                '@type': 'Offer',
                availability: 'https://schema.org/OutOfStock',
                url: 'https://e.com/restock'
            }
        )).body,
        '<div class="a"><div class="offer"><span class="availability"> Out of stock</span>'
            + '<a href="https://e.com/restock" class="offer-url"> Offer</a></div></div>'
    );
});

test('ui Offer.default derives a label without changing frozen schema availability', async () => {
    const offer = Object.freeze({
        '@type': 'Offer',
        availability: 'https://schema.org/InStock',
        availabilityLabel: 'Caller override'
    });
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Offer.default'; }",
        offer
    );

    assert.equal(body, '<div class="a"><div class="offer">'
        + '<span class="availability"> In stock</span></div></div>');
    assert.deepEqual(offer, {
        '@type': 'Offer',
        availability: 'https://schema.org/InStock',
        availabilityLabel: 'Caller override'
    });
});

test('ui Offer.default ignores caller-supplied availabilityLabel for an unknown availability', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Offer.default'; }",
        {
            '@type': 'Offer',
            availability: 'CustomStatus',
            availabilityLabel: 'Caller override'
        }
    );

    assert.equal(body, '<div class="a"><div class="offer">'
        + '<span class="availability"> CustomStatus</span></div></div>');
});

test('ui Offer.default ignores caller-supplied availabilityLabel when availability is absent', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Offer.default'; }",
        {
            '@type': 'Offer',
            priceCurrency: 'EUR',
            availabilityLabel: 'Caller override'
        }
    );

    assert.equal(body, '<div class="a"><div class="offer">'
        + '<span class="price-currency"> EUR</span></div></div>');
    assert.doesNotMatch(body, /availability/);
});

test('ui Offer.default resolves availability and link labels through the language model', async t => {
    const get = jTormLanguageModel.get;
    jTormLanguageModel.get = function (value, locale) {
        if (value === 'In stock') return 'Available now';
        if (value === 'Offer') return 'View offer';
        return get.call(this, value, locale);
    };
    t.after(() => { jTormLanguageModel.get = get; });

    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Offer.default'; }",
        {
            '@type': 'Offer',
            availability: 'https://schema.org/InStock',
            url: 'https://e.com/translated-offer'
        }
    );
    const document = new JSDOM(`<body>${body}</body>`).window.document;

    assert.equal(textContent(document.querySelector('.availability')), 'Available now');
    assert.equal(textContent(document.querySelector('.offer-url')), 'View offer');
    assert.equal(document.querySelector('.offer-url').getAttribute('href'), 'https://e.com/translated-offer');
});

test('ui Offer.default labels every official ItemAvailability value over HTTP and HTTPS', async () => {
    for (const scheme of ['http', 'https']) {
        for (const [value, label] of AVAILABILITY_LABELS) {
            const { body } = await render(
                '<body><div class="a"></div></body>',
                ".a->ui { c: 'Offer.default'; }",
                { '@type': 'Offer', availability: `${scheme}://schema.org/${value}` }
            );
            const availability = new JSDOM(`<body>${body}</body>`)
                .window.document.querySelector('.availability');

            assert.equal(textContent(availability), label, `${scheme}:${value}`);
        }
    }
});

test('ui Offer.default treats multiline availability values as one escaped unknown value', async () => {
    for (const separator of ['\n', '\r\n', '\u2028', '\u2029']) {
        const value = `https://schema.org/InStock${separator}https://schema.org/OutOfStock`;
        const { body } = await render(
            '<body><div class="a"></div></body>',
            ".a->ui { c: 'Offer.default'; }",
            { '@type': 'Offer', availability: value }
        );
        const document = new JSDOM(`<body>${body}</body>`).window.document;
        const availability = [...document.querySelectorAll('.availability')];

        assert.equal(availability.length, 1, JSON.stringify(separator));
        assert.equal(
            availability[0].textContent.trim(),
            value.replace(/\r\n/g, '\n'),
            JSON.stringify(separator)
        );
    }
});

test('ui Offer.default does not label an availability host lookalike as canonical', async () => {
    const availability = 'https://schemaxorg/InStock';
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Offer.default'; }",
        { '@type': 'Offer', availability }
    );

    assert.equal(body, '<div class="a"><div class="offer"><span class="availability"> '
        + availability + '</span></div></div>');
});

test('ui Offer.default with all optional fields absent emits no markup', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Offer.default'; }",
        { '@type': 'Offer' }
    );

    assert.equal(body, '<div class="a"></div>');
});

test('ui Product.default with an empty nested Offer emits no commerce markup', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Product.default'; }",
        { '@type': 'Product', name: 'Empty offer', offers: { '@type': 'Offer' } }
    );

    assert.equal(body, '<div class="a"><section class="thing product"><div class="contents">'
        + '<header class="header"><h1><a>Empty offer</a></h1></header>'
        + '<section class="body"></section><footer class="footer"></footer></div></section></div>');
    assert.doesNotMatch(body, /class="offer"/);
});

test('ui Product.default escapes commerce text and a malformed availability fallback', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Product.default'; }",
        {
            '@type': 'Product',
            name: XSS,
            description: XSS,
            sku: XSS,
            gtin: XSS,
            brand: { '@type': 'Brand', name: XSS },
            offers: {
                '@type': 'Offer',
                price: XSS,
                priceCurrency: XSS,
                availability: XSS
            }
        }
    );

    assert.equal(new JSDOM(`<body>${body}</body>`).window.document.querySelector('img'), null);
    assert.equal(body.split(ESC).length - 1, 8);
});

test('ui Offer.default rejects an unsafe schema.org url through the existing href guard', async () => {
    await assert.rejects(
        render(
            '<body><div class="a"></div></body>',
            ".a->ui { c: 'Offer.default'; }",
            { '@type': 'Offer', price: '1', url: 'javascript:alert(1)' }
        ),
        /Unsafe attribute href/
    );
});

test('ui Product.default rejects unsafe Product, brand, and image URLs', async () => {
    const image = {
        '@id': '/unsafe-product-image',
        '@type': 'ImageObject',
        contentUrl: 'javascript:alert(1)',
        name: 'Unsafe image'
    };
    const cases = [
        [
            'Product.url',
            { '@type': 'Product', name: 'Unsafe product', url: 'javascript:alert(1)' },
            null
        ],
        [
            'brand.url',
            {
                '@type': 'Product',
                name: 'Unsafe brand',
                brand: { '@type': 'Brand', name: 'Brand', url: 'javascript:alert(1)' }
            },
            null
        ],
        [
            'offers.url',
            {
                '@type': 'Product',
                name: 'Unsafe offer',
                offers: { '@type': 'Offer', price: '1', url: 'javascript:alert(1)' }
            },
            null
        ],
        [
            'image.contentUrl',
            { '@type': 'Product', name: 'Unsafe image', image },
            { '/unsafe-product-image': { json: image } }
        ]
    ];

    for (const [field, data, fixtures] of cases)
        await assert.rejects(
            render(
                '<body><div class="a"></div></body>',
                ".a->ui { c: 'Product.default'; }",
                data,
                'http://localhost/',
                fixtures
            ),
            /Unsafe attribute (?:href|src)/,
            field
        )
    ;
});
