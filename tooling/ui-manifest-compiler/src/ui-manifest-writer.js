/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

module.exports = async function (result, outDir) {
    if (!result || typeof result !== 'object'
        || typeof result.json !== 'string'
        || typeof result.hash !== 'string'
        || !result.manifest
        || typeof result.manifest.id !== 'string')
        throw new Error('Manifest output invalid')
    ;

    const dir = path.resolve(outDir);
    const name = result.manifest.id + '.' + result.hash + '.json';
    if (result.filename !== name
        || !/^[a-z0-9][a-z0-9_-]{0,63}[.]sha256-[0-9a-f]{64}[.]json$/.test(name))
        throw new Error('Manifest output invalid')
    ;

    await fs.mkdir(dir, { recursive: true });
    const final = path.resolve(dir, name);
    if (path.dirname(final) !== dir)
        throw new Error('Manifest output path invalid')
    ;

    const temp = final + '.' + process.pid + '.'
        + randomBytes(12).toString('hex') + '.tmp';
    let h;

    try {
        h = await fs.open(temp, 'wx', 0o600);
        await h.writeFile(result.json, 'utf8');
        await h.sync();
        await h.close();
        h = null;
        try {
            await fs.link(temp, final);
            return { path: final, created: true };
        } catch (e) {
            if (!e || e.code !== 'EEXIST')
                throw e
            ;
            if (!Buffer.from(await fs.readFile(final)).equals(Buffer.from(result.json)))
                throw new Error('Manifest output conflict ' + final)
            ;
            return { path: final, created: false };
        }
    } finally {
        if (h)
            await h.close().catch(function () {})
        ;
        await fs.unlink(temp).catch(function (e) {
            if (e && e.code !== 'ENOENT')
                throw e
            ;
        });
    }
};
