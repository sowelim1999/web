import { getDistanceEuclidean, getDistance } from './utils.mjs';

class Node {
    constructor(ll) {
        this.ll = ll;
        this.parent = null; // parent (Node class)
        this.fromStart = Infinity; // cummulative weight from the start (g)
        this.toEnd = 0; // weight from the start + heuristic-to-the-end (to sort queue) (f)
    }
}

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

            const points = pathSegmentsGeometry(path.reverse());

            debug.points = points.length;
            debug.distance = getPointsDistance(points);

            return { points, debug };
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
                neighbor.toEnd = neighbor.fromStart + heuristic(neighbor, finish);
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

    return { points: null, debug }; // failed
}

function heuristic(nodeA, nodeB) {
    // if (nodeA) {
    //     return 0;
    // }
    const [latA, lngA] = nodeA.ll.split(',');
    const [latB, lngB] = nodeB.ll.split(',');
    return getDistanceEuclidean(latA, lngA, latB, lngB);
}

function pathSegmentsGeometry(path) {
    let points = [];
    for (const node of path) {
        if (node.segment) {
            points = points.concat(node.segment);
        }
    }
    return points;
}

function getPointsDistance(points) {
    let distance = 0;

    if (points.length >= 2) {
        for (let i = 1; i < points.length; i++) {
            const A = points[i];
            const B = points[i - 1];
            distance += getDistance(A[0], A[1], B[0], B[1]);
        }
    }

    return Math.round(distance);
}
