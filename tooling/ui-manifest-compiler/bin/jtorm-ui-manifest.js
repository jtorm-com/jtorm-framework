#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { createHash } = require('node:crypto');
const {
    jTormUiManifestCompiler: compiler
} = require('../src/ui-manifest-compiler.js');
const {
    jTormUiManifestModel: manifest
} = require('@jtorm/ui-manifest-model');

function option(args, name) {
    const i = args.indexOf(name);

    if (i < 0 || !args[i + 1] || args.indexOf(name, i + 1) >= 0)
        throw new Error('Usage: jtorm-ui-manifest --config <file> --out-dir <directory>')
    ;

    return args[i + 1];
}

async function main() {
    const args = process.argv.slice(2);
    const configPath = option(args, '--config');
    const outDir = option(args, '--out-dir');

    if (args.length !== 4)
        throw new Error('Usage: jtorm-ui-manifest --config <file> --out-dir <directory>')
    ;

    manifest.digest = async function (bytes) {
        return new Uint8Array(createHash('sha256').update(bytes).digest());
    };
    compiler.manifest = manifest;

    let configs = require(path.resolve(configPath));
    if (!Array.isArray(configs))
        configs = [configs]
    ;

    for (const config of configs) {
        const result = await compiler.compile(config);
        await compiler.write(result, outDir);
        process.stdout.write(result.filename + '\n');
    }
}

main().catch(function (e) {
    process.stderr.write((e && e.message || String(e)) + '\n');
    process.exitCode = 1;
});
