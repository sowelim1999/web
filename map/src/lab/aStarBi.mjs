'use strict';

import { Node, Debug, getGeometryDistance, getDistanceEuclidean } from './lib.mjs';

/**
 * aStarBi (BA*) simple Bidirectional A* (search the shortest path in the graph)
 *
 * @param graph <Object> Undirected Weighted Graph from featuresToWeightedGraph()
 * @param src, dst <String> Start/Finish nodes in LL format: "lat,lng"
 * @param avoidHeuristics <Bool> when true, BA* acts as BI-Dijkstra
 *
 * @return { failedAtStart } <Bool> route failed because start is deadlocked
 * @return { failedAtFinish } <Bool> route failed because finish is deadlocked
 * @return { geometry } <Array> geometry of route (stored in graph, compiled by path)
 *
 * @return { debug } <JSON> debug values and statistics (see lib/class Debug)
 * @return { alternative } <Array> optional alternative geometry for debug purposes
 *
 * How the meet-in-the-middle works:
 *
 * 1) collect unique `middleCandidates` on every meet-point (cost as key)
 * 2) when `minCandidates` collected, finish the route by the best of them
 *
 * Note:
 * ...A variables are related to Forward search (src to dst)
 * ...B variables are related to Backward search (dst to src)
 */
export function aStarBi({ graph, src, dst, avoidHeuristics = false }) {
    const H = avoidHeuristics ? null : getDistanceEuclidean; // avoidHeuristics = true = Dijkstra

    const middleCandidates = new Map();
    const minCandidates = 10; // 5 is not enough, but 10 sometimes too

    const debug = new Debug(); // summarized debug for A+B

    const openA = [];
    const openB = [];
    const closedA = new Map();
    const closedB = new Map();
    const finishA = new Node(dst);
    const finishB = new Node(src);
    openA.push(new Node(src, { g: 0 }));
    openB.push(new Node(dst, { g: 0 }));

    for (;;) {
        let currentA = null;
        let currentB = null;

        // queue out A/B
        // (tried balancing but failed)
        const fetchA = openA.length > 0;
        const fetchB = openB.length > 0;
        // const fetchA = openA.length > 0 && (openB.length === 0 || openA.length <= openB.length); // failed
        // const fetchB = openB.length > 0 && (openA.length === 0 || openB.length < openA.length); // failed
        // const fetchA = openA.length > 0 && debugA.totalChecked <= debugB.totalChecked; // failed
        // const fetchB = openB.length > 0 && debugB.totalChecked < debugA.totalChecked; // failed
        if (fetchA) {
            openA.sort((a, b) => a.f - b.f);
            currentA = openA.shift();
            closedA.set(currentA.ll, currentA);
        }
        if (fetchB) {
            openB.sort((a, b) => a.f - b.f);
            currentB = openB.shift();
            closedB.set(currentB.ll, currentB);
        }

        // meet-in-the-middle
        const meetForA = currentA && closedB.get(currentA.ll);
        const meetForB = currentB && closedA.get(currentB.ll);
        if (meetForA) {
            const cost = currentA.g + meetForA.g;
            middleCandidates.set(cost, { A: currentA, B: meetForA });
        }
        if (meetForB) {
            const cost = currentB.g + meetForB.g;
            middleCandidates.set(cost, { A: currentB, B: meetForB });
        }
        if (meetForA || meetForB) {
            if (middleCandidates.size >= minCandidates) {
                const min = [...middleCandidates.keys()].sort((a, b) => a - b)[0];
                const { A, B } = middleCandidates.get(min);
                const geometry = A.geometry();
                const alternative = B.geometry();
                // debug.points = geometry.length + alternative.length;
                debug.distance = getGeometryDistance(geometry) + getGeometryDistance(alternative);
                return { geometry, alternative, debug };
            }
        }

        // check finished (but A/B have never met)
        if (currentA && currentA.ll === finishA.ll) {
            const geometry = currentA.geometry();
            // debug.points = geometry.length;
            debug.distance = getGeometryDistance(geometry);
            return { geometry, debug };
        }
        if (currentB && currentB.ll === finishB.ll) {
            const geometry = currentB.geometry();
            // debug.points = geometry.length;
            debug.distance = getGeometryDistance(geometry);
            return { geometry, debug };
        }

        // A-edges
        if (currentA) {
            for (const edge of graph[currentA.ll] || []) {
                const edgeLL = edge.node;

                // already closed - skip
                if (closedA.has(edgeLL)) {
                    continue;
                }

                const tentativeG = currentA.g + edge.weight;
                const ref = openA.find((node) => node.ll === edgeLL);

                debug.totalChecked++;

                if (ref) {
                    if (tentativeG < ref.g) {
                        // debug.totalUpdated++;
                        // update shorter
                        ref.g = tentativeG;
                        ref.f = ref.g + ref.h;
                        ref.parent = currentA;
                        ref.segment = edge.segment;
                    }
                } else {
                    // enqueue
                    const fresh = new Node(edgeLL);
                    fresh.g = tentativeG;
                    fresh.h = H ? h(H, fresh, finishA) : 0;
                    fresh.f = fresh.g + fresh.h;
                    fresh.parent = currentA;
                    fresh.segment = edge.segment;
                    openA.push(fresh);

                    // debug
                    edge.debug = true;
                    debug.uniqueQueued++;
                    openA.length + openB.length > debug.maxQueueSize &&
                        (debug.maxQueueSize = openA.length + openB.length);
                }
            }
        }

        // B-edges
        if (currentB) {
            for (const edge of graph[currentB.ll] || []) {
                const edgeLL = edge.node;

                // already closed - skip
                if (closedB.has(edgeLL)) {
                    continue;
                }

                const tentativeG = currentB.g + edge.weight;
                const ref = openB.find((node) => node.ll === edgeLL);

                debug.totalChecked++;

                if (ref) {
                    if (tentativeG < ref.g) {
                        // debug.totalUpdated++;
                        // update shorter
                        ref.g = tentativeG;
                        ref.f = ref.g + ref.h;
                        ref.parent = currentB;
                        ref.segment = edge.segment;
                    }
                } else {
                    // enqueue
                    const fresh = new Node(edgeLL);
                    fresh.g = tentativeG;
                    fresh.h = H ? h(H, fresh, finishB) : 0;
                    fresh.f = fresh.g + fresh.h;
                    fresh.parent = currentB;
                    fresh.segment = edge.segment;
                    openB.push(fresh);

                    // debug
                    edge.debug = true;
                    debug.uniqueQueued++;
                    openA.length + openB.length > debug.maxQueueSize &&
                        (debug.maxQueueSize = openA.length + openB.length);
                }
            }
        }

        // finally failed
        if (openA.length === 0 || openB.length === 0) {
            return {
                failedAtStart: openA.length === 0,
                failedAtFinish: openB.length === 0,
                geometry: null,
                debug,
            };
        }
    }
}

function h(H, nodeA, nodeB) {
    if (H === null) {
        return 0;
    }
    const [latA, lngA] = nodeA.ll.split(',');
    const [latB, lngB] = nodeB.ll.split(',');
    return H(latA, lngA, latB, lngB);
}
