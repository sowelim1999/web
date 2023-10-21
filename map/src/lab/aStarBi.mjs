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
 * Note:
 * ...A variables are related to Forward search (src to dst)
 * ...B variables are related to Backward search (dst to src)
 */
export function aStarBi({ graph, src, dst, avoidHeuristics = false }) {
    const H = avoidHeuristics ? null : getDistanceEuclidean; // avoidHeuristics = true = Dijkstra

    // Bi-A* meet method (increase search space)
    // reduce heuristics influence after the meet
    let meetOccured = false;
    const meetHeuristicsFactor = 0.75;
    const sorter = (a, b) =>
        meetOccured ? a.g + a.h * meetHeuristicsFactor - (b.g + b.h * meetHeuristicsFactor) : a.f - b.f;

    // Bi-Dijkstra meet based on Matthew Towers article (University College London)
    // https://www.homepages.ucl.ac.uk/~ucahmto/math/2020/05/30/bidirectional-dijkstra.html
    let middleMinimum = { g: Infinity, A: null, B: null };

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
        // TODO try balancing based on cost
        const fetchA = openA.length > 0;
        const fetchB = openB.length > 0;
        // const fetchA = openA.length > 0 && (openB.length === 0 || openA.length <= openB.length); // failed
        // const fetchB = openB.length > 0 && (openA.length === 0 || openB.length < openA.length); // failed
        // const fetchA = openA.length > 0 && debugA.totalChecked <= debugB.totalChecked; // failed
        // const fetchB(a, b) => a.f - b.fnB.length > 0 && debugB.totalChecked < debugA.totalChecked; // failed
        if (fetchA) {
            openA.sort(sorter);
            currentA = openA.shift();
            closedA.set(currentA.ll, currentA);
        }
        if (fetchB) {
            openB.sort(sorter);
            currentB = openB.shift();
            closedB.set(currentB.ll, currentB);
        }

        if (currentA && currentB && currentA.g + currentB.g >= middleMinimum.g) {
            const { A, B } = middleMinimum;
            const geometry = A.geometry();
            const alternative = B.geometry();
            // debug.points = geometry.length + alternative.length;
            debug.distance = getGeometryDistance(geometry) + getGeometryDistance(alternative);
            // console.log('g', currentA.g + currentB.g, middleMinimum.g);
            return { geometry, alternative, debug };
        }

        // check finished (when A/B have never met)
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

                if (closedB.has(edgeLL)) {
                    const opposite = closedB.get(edgeLL);
                    if (tentativeG + opposite.g < middleMinimum.g) {
                        meetOccured = true;
                        const fresh = new Node(edgeLL);
                        fresh.parent = currentA;
                        fresh.segment = edge.segment;
                        middleMinimum.A = fresh;
                        middleMinimum.B = opposite;
                        middleMinimum.g = tentativeG + opposite.g;
                    }
                }

                debug.totalChecked++;

                if (ref) {
                    if (tentativeG <= ref.g) {
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

                if (closedA.has(edgeLL)) {
                    const opposite = closedA.get(edgeLL);
                    if (tentativeG + opposite.g < middleMinimum.g) {
                        meetOccured = true;
                        const fresh = new Node(edgeLL);
                        fresh.parent = currentB;
                        fresh.segment = edge.segment;
                        middleMinimum.A = fresh;
                        middleMinimum.B = opposite;
                        middleMinimum.g = tentativeG + opposite.g;
                    }
                }

                debug.totalChecked++;

                if (ref) {
                    if (tentativeG <= ref.g) {
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
    const [latA, lngA] = nodeA.ll.split(',');
    const [latB, lngB] = nodeB.ll.split(',');
    return H(latA, lngA, latB, lngB);
}
