'use strict';

import {
    Node,
    Debug,
    getGeometryDistance,
    getPathSegmentsGeometry,
    getDistanceEuclidean,
    getDistance,
} from './lib.mjs';

const USE_HEURISTICS = true;
const FAST_HEURISTIRCS = true;

const H = USE_HEURISTICS ? (FAST_HEURISTIRCS ? getDistanceEuclidean : getDistance) : null;

export function aStar({ graph, startNodeLL, finishNodeLL }) {
    const debug = new Debug();

    const openNodes = []; // TODO https://github.com/mourner/tinyqueue
    const closedNodes = new Set();

    const finish = new Node(finishNodeLL);
    const start = new Node(startNodeLL);
    start.fromStart = 0; // toEnd ?
    openNodes.push(start);

    while (openNodes.length > 0) {
        // XXX use priority queue (binary heap) instead of sort()/push()
        openNodes.sort((a, b) => a.toEnd - b.toEnd);

        // shift the nearest node (by toEnd) and save it as closed
        const current = openNodes.shift();
        closedNodes.add(current.ll);

        // finally
        if (current.ll === finishNodeLL) {
            const path = [];

            path.push(current);
            let parent = current.parent;

            while (parent) {
                path.push(parent);
                parent = parent.parent;
            }

            path.reverse();

            const geometry = getPathSegmentsGeometry(path);

            debug.points = geometry.length;
            debug.distance = getGeometryDistance(geometry);

            return { geometry, debug };
        }

        for (const edge of graph[current.ll] || []) {
            const edgeLL = edge.node;
            debug.viewed++;

            // already closed - skip
            if (closedNodes.has(edgeLL)) {
                continue;
            }

            // search and use the found one or create a new neighbor
            const found = openNodes.find((node) => node.ll === edgeLL); // ref
            const neighbor = found ?? new Node(edgeLL);

            // check and update the shorter way
            const preliminaryFromStart = current.fromStart + edge.weight;
            if (preliminaryFromStart < neighbor.fromStart) {
                neighbor.fromStart = preliminaryFromStart;
                neighbor.toEnd = neighbor.fromStart + heuristicDistance(neighbor, finish);
                // neighbor.parent = current; // FIXME
            }

            // add to queue if not found
            if (!found) {
                edge.debug = true; // debug - modify graph - remove later
                debug.queued++; // debug

                neighbor.segment = edge.segment;
                neighbor.parent = current;
                openNodes.push(neighbor);
            }
        }
    }

    return { geometry: null, debug }; // failed
}

function heuristicDistance(nodeA, nodeB) {
    if (H === null) {
        return 0;
    }
    const [latA, lngA] = nodeA.ll.split(',');
    const [latB, lngB] = nodeB.ll.split(',');
    return H(latA, lngA, latB, lngB);
}
