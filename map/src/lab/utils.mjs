'use strict';

export function measure(f, tag, ms = 1000) {
    let counter = 0;
    let result = null;
    const started = Date.now();
    do {
        counter++;
        result = f();
    } while (Date.now() < started + ms);
    const delta = Date.now() - started;
    const rps = parseFloat(Number(counter * (ms / delta) * (1000 / ms)).toFixed(2));
    ms > 0 && console.debug(tag ?? f.name, rps || '~', 'run per second');
    return result;
}
