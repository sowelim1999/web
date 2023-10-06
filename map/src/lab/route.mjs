'use strict';

import { measure, getDistance } from './utils.mjs';

const LL_ROUND = 5; // toFixed()

export function testRoute({ map, startPoint, finishPoint }) {
    // const dist = () => getDistance(startPoint.lat, startPoint.lng, finishPoint.lat, finishPoint.lng);

    startPoint && true;
    finishPoint && true;

    const nodes = measure(() => featuresToNodes({ features: map.features }), 'nodes()');
    const graph = measure(() => featuresToWeightedGraph({ features: map.features, nodes }), 'graph()');
    // const graph = featuresToWeightedGraph({ features: map.features, nodes });

    const segments = Object.keys(graph).reduce((a, p) => a + graph[p].length, 0);

    console.log('nodes', nodes.length, 'found');
    console.log('graph', Object.keys(graph).length, 'filled with', segments, 'segments');

    return {
        points: [
            // [startPoint.lng, startPoint.lat],
            // [finishPoint.lng, finishPoint.lat],
        ],
        debugGeoJSON: makeGeoJSON({ points: nodes, graph: graph }),
    };
}

/**
 * @name featuresToWeightedGraph
 * @params { features, nodes } (GeoJSON features, nodes from featuresToNodes)
 * @return {startNode|endNode} = [node: endNode|startNode, weight, segment] (Bidirectional Weighted Graph)
 */
function featuresToWeightedGraph({ features, nodes }) {
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
                        segment = [];
                    } else {
                        // this is the end
                        const end = ll;
                        const weight = Math.round(dist);
                        graph[start] || (graph[start] = []);
                        graph[end] || (graph[end] = []);
                        graph[start].push({ node: end, weight, segment });
                        graph[end].push({ node: start, weight, segment });

                        // start over
                        start = end;

                        // reset accumulation
                        dist = 0;
                        segment = [];
                    }
                }
            });
        }
    });

    return graph;
}

/**
 * @name featuresToNodes
 * @params { features } (GeoJSON features)
 * @return ["lat,lng"] Array of strings as nodes
 *
 * Cycle on GeoJSON LineString features.
 * Map all points.toFixed(5) into ll["lat,lng"] to find intersections.
 * Map the LineString edges (1st, last points) to include them as nodes.
 * Finally, return nodes(vertices) by filtering Map for 2+ points counted.
 */
function featuresToNodes({ features }) {
    const latlng = {};

    features.forEach((f) => {
        if (f?.geometry?.type === 'LineString' && f?.geometry?.coordinates?.length > 0) {
            f.geometry.coordinates.forEach(([lng, lat], i, all) => {
                const ll = lat.toFixed(LL_ROUND) + ',' + lng.toFixed(LL_ROUND);
                latlng[ll] || (latlng[ll] = 0); // init latlng map
                i === all.length - 1 && latlng[ll]++; // last
                i === 0 && latlng[ll]++; // first
                latlng[ll]++; // any
            });
        }
    });

    return Object.keys(latlng).filter((k) => latlng[k] >= 2);
}

function makeGeoJSON({ points, graph }) {
    const features = [];

    points.forEach((ll) => {
        const [lat, lng] = ll.split(',');
        features.push({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [lng, lat],
            },
        });
    });

    Object.keys(graph).forEach((g) => {
        graph[g].forEach((e) => {
            const [latA, lngA] = g.split(',');
            const [latB, lngB] = e.node.split(',');
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [
                        [lngA, latA],
                        [lngB, latB],
                    ],
                },
            });
        });
    });

    return {
        type: 'FeatureCollection',
        features,
    };
}
