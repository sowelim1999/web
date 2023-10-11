'use strict';

const AVOID_HEURISTICS = false;

export const LL_ROUND = 5; // [lat,lng].toFixed() as a node key

export class Node {
    constructor(ll) {
        this.ll = ll; // node key ("lat,lng")
        this.parent = null; // parent (Node class)
        this.fromStart = Infinity; // cummulative weight from the start (g)
        this.toEnd = 0; // weight from the start + heuristic-to-the-end (to sort queue) (f)
    }
}

export class Debug {
    constructor() {
        this.queued = 0;
        this.viewed = 0;
        // points
        // distance
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
    return Math.sqrt(a * a + b * b) * 111111;
};

export function heuristicDistance(nodeA, nodeB) {
    if (AVOID_HEURISTICS) {
        return 0;
    }
    const [latA, lngA] = nodeA.ll.split(',');
    const [latB, lngB] = nodeB.ll.split(',');
    return getDistanceEuclidean(latA, lngA, latB, lngB);
}

export function getGeometryDistance(points) {
    let distance = 0;

    if (points.length >= 2) {
        for (let i = 1; i < points.length; i++) {
            const A = points[i];
            const B = points[i - 1];
            distance += getDistance(A[1], A[0], B[1], B[0]); // A/B is [lng,lat]
        }
    }

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
