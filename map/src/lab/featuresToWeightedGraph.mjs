'use strict';

import { LL_ROUND, getDistance } from './lib.mjs';

/**
 * @name featuresToWeightedGraph
 * @params { features, nodes } (GeoJSON features, nodes from featuresToNodes)
 * @return Object [startNode|endNode] = Array [node: endNode|startNode, weight, segment] (Undirected Weighted Graph)
 */
export function featuresToWeightedGraph({ features, nodes }) {
    const graph = {};
    const map = Object.fromEntries(nodes.map((n) => [n, true]));

    features.forEach((f) => {
        if (f?.geometry?.type === 'LineString' && f?.geometry?.coordinates?.length > 0) {
            let prev = null, // previous point to calculate dist
                dist = 0, // accumulated segment distance (weight)
                segment = []; // accumulated geometry for edge of graph

            let start = null; // start node key (ll)

            f.geometry.coordinates.forEach(([lng, lat] /*, i, all*/) => {
                const ll = lat.toFixed(LL_ROUND) + ',' + lng.toFixed(LL_ROUND);

                // accumulate distance and geometry
                prev && (dist += getDistance(lat, lng, prev.lat, prev.lng));
                segment.push([lng, lat]); // keep GeoJSON ll-sequence
                prev = { lat, lng };

                if (map[ll]) {
                    if (start === null) {
                        // start
                        start = ll;
                        // reset accumulation
                        dist = 0;
                        segment = [[lng, lat]];
                    } else {
                        // this is the end
                        const end = ll;
                        const weight = dist;
                        graph[start] || (graph[start] = []);
                        graph[end] || (graph[end] = []);
                        graph[start].push({ node: end, weight, segment });
                        graph[end].push({ node: start, weight, segment: [...segment].reverse() }); // reverse geo

                        // start over
                        start = end;

                        // reset accumulation
                        dist = 0;
                        segment = [[lng, lat]];
                    }
                }
            });
        }
    });

    return graph;
}
