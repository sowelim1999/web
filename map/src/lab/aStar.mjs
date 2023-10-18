'use strict';

import { Node, Debug, getGeometryDistance, getDistanceEuclidean, getDistance } from './lib.mjs';

const FAST_HEURISTIRCS = true;

export function aStar({ graph, src, dst, avoidHeuristics = false }) {
    const debug = new Debug();

    let H = FAST_HEURISTIRCS ? getDistanceEuclidean : getDistance;
    avoidHeuristics && (H = null); // A* without heuristics is just a Dijkstra (limited by finish-node)

    const openNodes = [];
    const closedNodes = new Set();

    const start = new Node(src);
    const finish = new Node(dst);

    start.g = 0;
    start.segment = null;
    openNodes.push(start);

    while (openNodes.length > 0) {
        // sort() as priority queue
        openNodes.sort((a, b) => a.f - b.f);

        // shift node with the shortest path and save it as closed
        const current = openNodes.shift();

        // add to closed nodes
        closedNodes.add(current.ll);

        // finally, got the route
        if (current.ll === dst) {
            const geometry = current.geometry();
            debug.distance = getGeometryDistance(geometry);
            debug.points = geometry.length;
            return { geometry, debug };
        }

        for (const edge of graph[current.ll] || []) {
            const edgeLL = edge.node;

            // already closed - skip
            if (closedNodes.has(edgeLL)) {
                continue;
            }

            const tentativeG = current.g + edge.weight;
            const ref = openNodes.find((node) => node.ll === edgeLL);

            debug.totalChecked++; // debug

            if (ref) {
                if (tentativeG < ref.g) {
                    // update shorter
                    ref.g = tentativeG;
                    ref.f = ref.g + ref.h;
                    ref.parent = current;
                    ref.segment = edge.segment;

                    debug.totalUpdated++; // debug
                }
            } else {
                // enqueue
                const fresh = new Node(edgeLL);
                fresh.g = tentativeG;
                fresh.h = h(H, fresh, finish);
                fresh.f = fresh.g + fresh.h;
                fresh.parent = current;
                fresh.segment = edge.segment;
                openNodes.push(fresh);

                // debug
                edge.debug = true;
                debug.uniqueQueued++;
                openNodes.length > debug.maxQueueSize && (debug.maxQueueSize = openNodes.length);
            }
        }
    }

    return { geometry: null, debug }; // failed
}

function h(H, nodeA, nodeB) {
    if (H === null) {
        return 0;
    }
    const [latA, lngA] = nodeA.ll.split(',');
    const [latB, lngB] = nodeB.ll.split(',');
    return H(latA, lngA, latB, lngB);
}

// /**
//  * Performance notes:
//  * 1) sort() + shift: OK (default)
//  * 2) min-find + closedNodes.has() + no-remove: slow (8x worst)
//  *
//  * TODO: try min-find with openNodes slice
//  * TODO: try openNodes as Set/Map hash object
//  * TODO: try priority queue: https://github.com/mourner/tinyqueue
//  */
// // (1) default sort() as priority queue
// openNodes.sort((a, b) => a.f - b.f);

// // (2) slow...
// // let min = Infinity;
// // let current = null;
// // openNodes.forEach((n) => {
// //     if (n.toEnd < min && !closedNodes.has(n.ll)) {
// //         current = n;
// //         min = n.toEnd;
// //     }
// // });

// // shift node with the shortest path and save it as closed
// const current = openNodes.shift();
// closedNodes.add(current.ll);
