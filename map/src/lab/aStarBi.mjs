'use strict';

import FastPriorityQueue from 'fastpriorityqueue';
import { Node, Debug, getGeometryDistance, getDistanceEuclidean } from './lib.mjs';

/**
 * aStarBi (BA*) simple Bidirectional A* (search the shortest path in the graph)
 *
 * @param graph <Object> Undirected Weighted Graph from featuresToWeightedGraph()
 * @param src, dst <String> Start/Finish nodes in LL format: "lat,lng"
 * @param dijkstra <Bool> when true, BA* acts as BI-Dijkstra
 *
 * @return { failedAtStart } <Bool> route failed because start is deadlocked
 * @return { failedAtFinish } <Bool> route failed because finish is deadlocked
 * @return { geometry } <Array> geometry of route (stored in graph, compiled by path)
 *
 * @return { debug } <JSON> debug values and statistics (see lib/class Debug)
 * @return { alternative } <Array> optional alternative geometry for debug purposes
 *
 * Meet-in-the-middle methods:
 *
 * 1) Bi-Dijkstra meet based on Matthew Towers article (University College London)
 * https://www.homepages.ucl.ac.uk/~ucahmto/math/2020/05/30/bidirectional-dijkstra.html
 *
 * 2) Bi-A* meet based on increasing search space by reduction of heuristics influence.
 * After the meet, `meetHeuristicsFactor` (0.75) is used as reduction factor.
 * Do not forget to resort openQueue(s) when `meetMin.reorderQueue` true.
 *
 * Note:
 * ...A variables are related to Forward search (src to dst)
 * ...B variables are related to Backward search (dst to src)
 */
export function aStarBi({ graph, src, dst, dijkstra = false }) {
    const H = dijkstra ? null : getDistanceEuclidean;

    // Bi-Dijkstra meet
    let meetMin = { g: Infinity, A: null, B: null, meetOccured: false, reorderQueue: false };

    // Bi-A* meet
    const meetHeuristicsFactor = 0.75;
    const sorter = (a, b) =>
        meetMin.meetOccured ? a.g + a.h * meetHeuristicsFactor < b.g + b.h * meetHeuristicsFactor : a.f < b.f;

    const debug = new Debug(); // summarized debug for A+B

    const [openQueueA, openMapA, closedMapA, finishA] = initQueues({ src: src, dst: dst, sorter });
    const [openQueueB, openMapB, closedMapB, finishB] = initQueues({ src: dst, dst: src, sorter });

    for (;;) {
        const currentA = fetchCurrent({ openQueue: openQueueA, closedMap: closedMapA });
        const currentB = fetchCurrent({ openQueue: openQueueB, closedMap: closedMapB });

        // It is possible to catchFinish() after processEdges() but it will take +1 cycle
        const finish = catchFinish({ currentA, currentB, finishA, finishB, meetMin, debug });

        if (finish) {
            return finish;
        }

        processEdges({
            graph,
            current: currentA,
            openQueue: openQueueA,
            openMap: openMapA,
            closedMap: closedMapA,
            closedOpposite: closedMapB,
            finish: finishA,
            meetMin,
            debug,
            H,
        });

        processEdges({
            graph,
            current: currentB,
            openQueue: openQueueB,
            openMap: openMapB,
            closedMap: closedMapB,
            closedOpposite: closedMapA,
            finish: finishB,
            meetMin,
            debug,
            H,
        });

        // A* only: reorder after meet (`meetHeuristicsFactor`)
        if (meetMin.reorderQueue && dijkstra === false) {
            meetMin.reorderQueue = false;
            reorderQueue({ queue: openQueueA });
            reorderQueue({ queue: openQueueB });
        }

        debug.uniqueQueued = openMapA.size + openMapB.size;

        const failed = catchFailed({ openQueueA, openQueueB, debug });

        if (failed) {
            return failed;
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

function initQueues({ src, dst, sorter }) {
    const openMap = new Map();
    const openQueue = new FastPriorityQueue(sorter);
    const start = new Node(src, { g: 0 });
    openMap.set(src, start);
    openQueue.add(start);
    const closedMap = new Map();
    const finish = new Node(dst);
    return [openQueue, openMap, closedMap, finish];
}

function fetchCurrent({ openQueue, closedMap }) {
    if (openQueue.size > 0) {
        const current = openQueue.poll();
        closedMap.set(current.ll, current);
        return current;
    }
    return null;
}

function catchFinish({ currentA, currentB, finishA, finishB, meetMin, debug }) {
    if (currentA && currentB && currentA.g + currentB.g >= meetMin.g) {
        const { A, B } = meetMin;
        const geometry = A.geometry();
        const alternative = B.geometry();
        // debug.points = geometry.length + alternative.length;
        debug.distance = getGeometryDistance(geometry) + getGeometryDistance(alternative);
        // console.log('g', currentA.g + currentB.g, meetMin.g);
        return { geometry, alternative, debug };
    }

    // check finish A->B
    if (currentA && currentA.ll === finishA.ll) {
        const geometry = currentA.geometry();
        // debug.points = geometry.length;
        debug.distance = getGeometryDistance(geometry);
        return { geometry, debug };
    }

    // check finish B->A
    if (currentB && currentB.ll === finishB.ll) {
        const geometry = currentB.geometry();
        // debug.points = geometry.length;
        debug.distance = getGeometryDistance(geometry);
        return { geometry, debug };
    }

    return null;
}

function catchFailed({ openQueueA, openQueueB, debug }) {
    if (openQueueA.size === 0 || openQueueB.size === 0) {
        return {
            failedAtStart: openQueueA.size === 0,
            failedAtFinish: openQueueB.size === 0,
            geometry: null,
            debug,
        };
    }
    return null;
}

function processEdges({ graph, current, openQueue, openMap, closedMap, closedOpposite, meetMin, finish, debug, H }) {
    if (current) {
        for (const edge of graph[current.ll] ?? []) {
            const edgeLL = edge.node;

            if (closedMap.has(edgeLL)) {
                continue;
            }

            debug.totalChecked++; // debug

            const tentativeG = current.g + edge.weight;
            const ref = openMap.get(edgeLL) ?? new Node(edgeLL);

            // better candidate
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
            }

            // prepare meet point
            if (closedOpposite.has(edgeLL)) {
                const opposite = closedOpposite.get(edgeLL);
                if (tentativeG + opposite.g < meetMin.g) {
                    if (meetMin.meetOccured === false) {
                        meetMin.reorderQueue = true;
                        meetMin.meetOccured = true;
                    }
                    meetMin.A = ref;
                    meetMin.B = opposite;
                    meetMin.g = tentativeG + opposite.g;
                }
            }
        }
    }
}

function reorderQueue({ queue }) {
    const refresh = [];
    queue.forEach((q) => refresh.push(q));
    queue.heapify(refresh); // replace and resort queue
}
