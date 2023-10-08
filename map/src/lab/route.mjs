'use strict';

import { measure } from './utils.mjs';
import { featuresToNodes } from './featuresToNodes.mjs';
import { featuresToWeightedGraph } from './featuresToWeightedGraph.mjs';

export function testRoute({ map, startPoint, finishPoint }) {
    // const dist = () => getDistance(startPoint.lat, startPoint.lng, finishPoint.lat, finishPoint.lng);

    startPoint && true;
    finishPoint && true;

    const nodes = measure(() => featuresToNodes({ features: map.features }), 'nodes()');

    // filter nodes closer to A<->B line
    // create graph from filtered nodes
    // check is graph fully connected
    // when it's connected, call A*

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
