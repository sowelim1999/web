'use strict';

export const LL_ROUND = 5; // [lat,lng].toFixed() as a node key

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

// 25% faster than haversine - ok for heuristics
export const getDistanceEuclidean = (lat1, lng1, lat2, lng2) => {
    const a = Math.pow(lat2 - lat1, 2);
    const b = Math.pow(lng2 - lng1, 2);
    return Math.sqrt(a + b) * 100000;
};

export const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6372.8; // for haversine use R = 6372.8 km instead of 6371 km
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    // return parseFloat(Number(2 * R * 1000 * Math.asin(Math.sqrt(a))).toFixed(2)); // the slowest
    // return Math.round(2 * R * 1000 * Math.asin(Math.sqrt(a) * 100)) / 100; // precision ~1cm
    return 2 * R * 1000 * Math.asin(Math.sqrt(a)); // the fastest
};

const toRadians = (angdeg) => {
    return (angdeg / 180.0) * Math.PI;
};
