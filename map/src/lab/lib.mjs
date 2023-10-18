'use strict';

export const LL_ROUND = 5; // [lat,lng].toFixed() as a node key (LL_ROUND = 5 = ~1m)

export class Node {
    constructor(ll) {
        this.ll = ll; // node key ("lat,lng")
        this.parent = null; // parent (Node class)
        this.segment = null; // geometry (from graph)
        this.g = Infinity; // cost (weight sum) from start
        this.h = 0; // heuristics
        this.f = 0; // g + h
    }
    path() {
        const nodes = [];
        for (let next = this; next; next = next.parent) {
            nodes.push(next);
        }
        nodes.reverse();
        return nodes;
    }
    geometry() {
        return getPathSegmentsGeometry(this.path());
    }
}

export class Debug {
    constructor() {
        this.started = Date.now();
        this.maxQueueSize = 0;
        this.uniqueQueued = 0;
        this.totalChecked = 0;
        this.totalUpdated = 0;
        this.ms = 0;
        this.points = 0;
        this.distance = 0;
    }
    toString() {
        this.ms = Date.now() - this.started;
        delete this.started;
        return JSON.stringify(this).replaceAll('"', ' ').replaceAll(' :', ': ').replace('}', ' }');
        // return `Debug { maxQueueSize: ${this.maxQueueSize}, uniqueQueued: ${this.uniqueQueued}, totalUpdated: ${this.totalUpdated}, ms: ${ms}, distance: ${this.distance} }`;
    }
}

export const getDistance = (lat1, lng1, lat2, lng2) => {
    const toRadians = (angdeg) => (angdeg / 180.0) * Math.PI;
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

// 25% faster than haversine - ok for heuristics
export const getDistanceEuclidean = (lat1, lng1, lat2, lng2) => {
    const a = lat2 - lat1;
    const b = lng2 - lng1;
    return Math.sqrt(Math.pow(a * 111229, 2) + Math.pow(b * 71695, 2));
};

export function getGeometryDistance(points) {
    let distance = 0;

    if (points.length >= 2) {
        for (let i = 1; i < points.length; i++) {
            const A = points[i];
            const B = points[i - 1];
            distance += getDistance(A[1], A[0], B[1], B[0]); // A/B is [lng,lat]
        }
    }

    // return distance;
    return Math.round(distance);
}

export function getPathSegmentsGeometry(path) {
    let points = [];
    for (const node of path) {
        if (node.segment) {
            points = points.concat(node.segment);
        }
    }
    return points;
}
