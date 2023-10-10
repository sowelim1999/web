'use strict';

import { getDistance } from './utils.mjs';

/**
 * @name filterGraph
 * @params { graph, radius, startPoint, finishPoint, ignoreNodes }
 * @return { graph, startNodeLL, finishNodeLL }
 *
 * Keep nodes belong to line between startPoint/finishPoint.
 * Use radius as a maximum distance around start/finish circles.
 * Additionally, use radius as a maximum distance from start-finish line.
 *
 * By the way, find the nearest start/finish nodes among of filtered nodes.
 *
 * Call function in the cycle with growing radius until routing succeeded.
 * Each cycle should increase the radius and expand `ignoreNodes` map object.
 * Use `ignoreNodes` to avoid "bad" nodes (e.g. append "unrouted" start/finish nodes).
 *
 * XXX filtering using bbox instead of radius should be **much** faster
 */
export function filterGraph({ graph, radius, startPoint, finishPoint, ignoreNodes = {} }) {
    const isInside = ({ lat, lng, center, radius }) => getDistance(lat, lng, center.lat, center.lng) <= radius;

    const isBetween = ({ lat, lng, startPoint, finishPoint, radius }) => {
        if (isInside({ lat, lng, center: startPoint, radius }) || isInside({ lat, lng, center: finishPoint, radius })) {
            return true;
        }
        const distance = Math.round(getDistance(startPoint.lat, startPoint.lng, finishPoint.lat, finishPoint.lng));
        for (let i = radius; i <= distance; i += radius) {
            const center = {
                // XXX non-haversine - need more accuracy for long distance
                lat: startPoint.lat + (i / distance) * (finishPoint.lat - startPoint.lat),
                lng: startPoint.lng + (i / distance) * (finishPoint.lng - startPoint.lng),
            };
            if (isInside({ lat, lng, center, radius })) {
                return true;
            }
        }
        return false;
    };

    let startNodeLL = null;
    let finishNodeLL = null;
    let startMin = Infinity;
    let finishMin = Infinity;

    function keepStartFinishNodesCloser({ ll, lat, lng }) {
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

    const filtered = {};
    Object.keys(graph)
        .filter((ll) => {
            if (ignoreNodes[ll]) {
                return false;
            }

            const [lat, lng] = ll.split(',');

            // try the node
            if (isBetween({ lat, lng, startPoint, finishPoint, radius })) {
                keepStartFinishNodesCloser({ ll, lat, lng });
                return true;
            }

            // try ends of the edges
            if (
                graph[ll].some((edge) => {
                    const end = edge.node;

                    if (ignoreNodes[edge]) {
                        return false;
                    }

                    const [lat, lng] = end.split(',');
                    if (isBetween({ lat, lng, startPoint, finishPoint, radius })) {
                        keepStartFinishNodesCloser({ ll: end, lat, lng });
                        return true;
                    }
                })
            ) {
                return true;
            }

            return false;
        })
        .forEach((ll) => (filtered[ll] = graph[ll]));
    return { graph: filtered, startNodeLL, finishNodeLL };
}
