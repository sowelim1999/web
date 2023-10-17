'use strict';

import { Node, Debug, getGeometryDistance, getDistanceEuclidean } from './lib.mjs';

export function aStarBi({ graph, src, dst, avoidHeuristics = false }) {
    const H = avoidHeuristics ? null : getDistanceEuclidean;

    // const isDijkstra = !!avoidHeuristics;

    const debugA = new Debug();
    const debugB = new Debug();
    const debug = new Debug(); // summarized debug for A+B

    const openA = [];
    const openB = [];

    const closedA = new Set();
    const closedB = new Set();

    const finishA = new Node(dst);
    const finishB = new Node(src);

    const startA = new Node(src);
    const startB = new Node(dst);
    startA.g = 0;
    startB.g = 0;
    startA.segment = null;
    startB.segment = null;
    openA.push(startA);
    openB.push(startB);

    for (;;) {
        if (openA.length > 0) {
            openA.sort((a, b) => a.f - b.f);

            const current = openA.shift();
            closedA.add(current.ll);

            if (current.ll === finishA.ll) {
                const geometry = current.geometry();
                debug.distance = getGeometryDistance(geometry);
                debugA.distance = debug.distance;
                return { geometry, debug, debugA, debugB };
            }

            for (const edge of graph[current.ll] || []) {
                const edgeLL = edge.node;

                // already closed - skip
                if (closedA.has(edgeLL)) {
                    continue;
                }

                const tentativeG = current.g + edge.weight;
                const ref = openA.find((node) => node.ll === edgeLL);

                debug.totalChecked++;
                debugA.totalChecked++;

                if (ref) {
                    if (tentativeG < ref.g) {
                        debug.totalUpdated++;
                        debugA.totalUpdated++;
                        // update shorter
                        ref.g = tentativeG;
                        ref.f = ref.g + ref.h;
                        ref.parent = current;
                        ref.segment = edge.segment;
                    }
                } else {
                    // enqueue
                    const fresh = new Node(edgeLL);
                    fresh.g = tentativeG;
                    fresh.h = H ? h(H, fresh, finishA) : 0;
                    fresh.f = fresh.g + fresh.h;
                    fresh.parent = current;
                    fresh.segment = edge.segment;
                    openA.push(fresh);

                    // debug
                    edge.debug = true;
                    debug.uniqueQueued++;
                    debugA.uniqueQueued++;
                    openA.length > debugA.maxQueueSize && (debugA.maxQueueSize = openA.length);
                    openA.length + openB.length > debug.maxQueueSize &&
                        (debug.maxQueueSize = openA.length + openB.length);
                }
            }
        }

        if (openB.length > 0) {
            openB.sort((a, b) => a.f - b.f);

            const current = openB.shift();
            closedB.add(current.ll);

            if (current.ll === finishB.ll) {
                const geometry = current.geometry();
                debug.distance = getGeometryDistance(geometry);
                debugB.distance = debug.distance;
                return { geometry, debug, debugA, debugB };
            }

            for (const edge of graph[current.ll] || []) {
                const edgeLL = edge.node;

                // already closed - skip
                if (closedB.has(edgeLL)) {
                    continue;
                }

                const tentativeG = current.g + edge.weight;
                const ref = openB.find((node) => node.ll === edgeLL);

                debug.totalChecked++;
                debugB.totalChecked++;

                if (ref) {
                    if (tentativeG < ref.g) {
                        debug.totalUpdated++;
                        debugB.totalUpdated++;
                        // update shorter
                        ref.g = tentativeG;
                        ref.f = ref.g + ref.h;
                        ref.parent = current;
                        ref.segment = edge.segment;
                    }
                } else {
                    // enqueue
                    const fresh = new Node(edgeLL);
                    fresh.g = tentativeG;
                    fresh.h = H ? h(H, fresh, finishB) : 0;
                    fresh.f = fresh.g + fresh.h;
                    fresh.parent = current;
                    fresh.segment = edge.segment;
                    openB.push(fresh);

                    // debug
                    edge.debug = true;
                    debug.uniqueQueued++;
                    debugB.uniqueQueued++;
                    openB.length > debugB.maxQueueSize && (debugB.maxQueueSize = openB.length);
                    openA.length + openB.length > debug.maxQueueSize &&
                        (debug.maxQueueSize = openA.length + openB.length);
                }
            }
        }

        if (openA.length === 0) {
            return { geometry: null, failedAtStart: true, debug, debugA, debugB };
        }

        if (openB.length === 0) {
            return { geometry: null, failedAtFinish: true, debug, debugA, debugB };
        }
    }
    // return { geometry: null, debug, debugA, debugB }; // failed at all
}

function h(H, nodeA, nodeB) {
    if (H === null) {
        return 0;
    }
    const [latA, lngA] = nodeA.ll.split(',');
    const [latB, lngB] = nodeB.ll.split(',');
    return H(latA, lngA, latB, lngB);
}
