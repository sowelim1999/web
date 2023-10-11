'use strict';

import { Node, heuristicDistance, getGeometryDistance, getPathSegmentsGeometry } from './lib.mjs';

export function aStar({ graph, startNodeLL, finishNodeLL }) {
    const openNodes = []; // TODO https://github.com/mourner/tinyqueue
    const closedNodes = new Set();

    const finish = new Node(finishNodeLL);
    const start = new Node(startNodeLL);
    start.fromStart = 0; // toEnd ?
    openNodes.push(start);

    const debug = {
        queued: 0,
        viewed: 0,
    };

    while (openNodes.length > 0) {
        // XXX: use priority queue (binary heap) instead of sort()
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

            // check and update shorter way
            const preliminaryFromStart = current.fromStart + edge.weight;
            if (preliminaryFromStart < neighbor.fromStart) {
                neighbor.fromStart = preliminaryFromStart;
                neighbor.toEnd = neighbor.fromStart + heuristicDistance(neighbor, finish);
            }

            // add to queue if not found
            if (!found) {
                edge.debug = true; // debug - modify graph - remove later
                debug.queued++; // debug
                neighbor.parent = current;
                neighbor.segment = edge.segment;
                openNodes.push(neighbor);
            }
        }
    }

    return { geometry: null, debug }; // failed
}
