'use strict';

import FastPriorityQueue from 'fastpriorityqueue'; // 20% faster than @datastructures-js/priority-queue
import { Node, Debug, getGeometryDistance, getDistanceEuclidean, getDistance } from './lib.mjs';

const FAST_HEURISTIRCS = true;

export function aStar({ graph, src, dst, dijkstra = false }) {
    const debug = new Debug();

    let H = FAST_HEURISTIRCS ? getDistanceEuclidean : getDistance;
    dijkstra && (H = null); // A* without heuristics is just a Dijkstra (limited by finish-node)

    const openMap = new Map(); // 150x faster than openNodes.find on ~900 max queue / ~30 km route
    const openQueue = new FastPriorityQueue((a, b) => a.f < b.f);
    const closedSet = new Set();

    const start = new Node(src, { g: 0 });
    const finish = new Node(dst);
    openMap.set(src, start);
    openQueue.add(start);

    while (openQueue.size > 0) {
        const current = openQueue.poll();

        // add to closed nodes
        closedSet.add(current.ll);
        // openMap.delete(current.ll); // no need

        // success
        if (current.ll === dst) {
            const geometry = current.geometry();
            debug.distance = getGeometryDistance(geometry);
            // debug.points = geometry.length;
            return { geometry, debug };
        }

        for (const edge of graph[current.ll] || []) {
            const edgeLL = edge.node;

            if (closedSet.has(edgeLL)) {
                continue;
            }

            debug.totalChecked++; // debug
            const tentativeG = current.g + edge.weight;
            const ref = openMap.get(edgeLL) ?? new Node(edgeLL);

            if (tentativeG < ref.g) {
                ref.h = ref.h || h(H, ref, finish); // reuse if possible
                ref.g = tentativeG;
                ref.f = ref.g + ref.h;
                ref.parent = current;
                ref.segment = edge.segment;
                openMap.set(edgeLL, ref);
                openQueue.add(ref);

                // debug
                edge.debug = true;
                debug.maxQueueSize++;
                debug.uniqueQueued = openMap.size;
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
