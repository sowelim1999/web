'use strict';

import { getDistance } from './lib.mjs';

export function findStartFinishNodes({ graph, avoidNodes, startPoint, finishPoint }) {
    function keepStartFinishNodesCloser(ll) {
        if (avoidNodes[ll]) {
            return;
        }
        const [lat, lng] = ll.split(',');
        const startDist = getDistance(startPoint.lat, startPoint.lng, lat, lng);
        const finishDist = getDistance(finishPoint.lat, finishPoint.lng, lat, lng);

        if (startDist < startMin) {
            startMin = startDist;
            startNodeLL = ll;
        }

        if (finishDist < finishMin) {
            finishMin = finishDist;
            finishNodeLL = ll;
        }
    }
    let startNodeLL = null;
    let finishNodeLL = null;
    let startMin = Infinity;
    let finishMin = Infinity;

    Object.keys(graph).forEach((ll) => {
        keepStartFinishNodesCloser(ll);
        graph[ll].forEach((edge) => {
            delete edge.debug; // reset debug
            keepStartFinishNodesCloser(edge.node);
        });
    });

    return { startNodeLL, finishNodeLL };
}
