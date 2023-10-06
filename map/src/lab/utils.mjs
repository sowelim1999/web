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
    console.debug(
        tag ?? f.name,
        '~',
        parseFloat(Number(counter * (ms / delta) * (1000 / ms)).toFixed(2)),
        'per second'
    );
    return result;
}

export const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6372.8; // for haversine use R = 6372.8 km instead of 6371 km
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    // return parseFloat(Number(2 * R * 1000 * Math.asin(Math.sqrt(a))).toFixed(2)); // precision 1 cm is enough
    // return Math.round(2 * R * 1000 * Math.asin(Math.sqrt(a) * 100)) / 100; // precision 1 cm is enough
    return 2 * R * 1000 * Math.asin(Math.sqrt(a)); // the fastest
};

const toRadians = (angdeg) => {
    return (angdeg / 180.0) * Math.PI;
};
