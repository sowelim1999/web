'use strict';

const MEASURE = 1000;

import { filterGraph } from './filterGraph.mjs';
import { featuresToNodes } from './featuresToNodes.mjs';
import { featuresToWeightedGraph } from './featuresToWeightedGraph.mjs';

import { measure, RADIUS_START, RADIUS_MAX, RADIUS_EXPAND } from './utils.mjs';

export function testRoute({ map, startPoint, finishPoint }) {
    // const dist = () => getDistance(startPoint.lat, startPoint.lng, finishPoint.lat, finishPoint.lng);

    startPoint && true;
    finishPoint && true;

    // nodes & graph are independent on start/finish, so they should be pre-generated
    const mapNodes = measure(() => featuresToNodes({ features: map.features }), 'nodes()', MEASURE);
    const mapGraph = measure(
        () => featuresToWeightedGraph({ features: map.features, nodes: mapNodes }),
        'graph()',
        MEASURE
    );

    const segments = Object.keys(mapGraph).reduce((a, p) => a + mapGraph[p].length, 0);
    console.log('map Nodes/Graph', mapNodes.length, Object.keys(mapGraph).length, 'filled with', segments, 'segments');

    let cycles = 0;
    const ignoreNodes = {}; // used to find better startNode/finishNode every cycle

    for (let radius = RADIUS_START; radius <= RADIUS_MAX; radius += RADIUS_EXPAND) {
        cycles++;

        const { graph, startNode, finishNode } = measure(
            () => filterGraph({ graph: mapGraph, radius, startPoint, finishPoint, ignoreNodes }),
            'filter() [' + radius / 1000 + ' km]',
            MEASURE
        );

        ignoreNodes[startNode] = true;
        ignoreNodes[finishNode] = true;

        const segments = Object.keys(graph).reduce((a, p) => a + graph[p].length, 0);
        console.log('cycle', cycles, 'graph', Object.keys(graph).length, 'filled with', segments, 'segments');

        if (cycles >= 5) {
            return {
                points: [
                    // [startPoint.lng, startPoint.lat],
                    // [finishPoint.lng, finishPoint.lat],
                ],
                debugGeoJSON: makeGeoJSON({ points: [startNode, finishNode], graph: graph }),
                // debugGeoJSON: makeGeoJSON({ points: nodes, graph: graph }),
            };
        }
    }

    throw new Error('failed');

    // filter nodes closer to A<->B line
    // create graph from filtered nodes
    // check is graph fully connected (?)
    // prioritize graph by distance to A/B
    // when it's connected, call A*
}

function makeGeoJSON({ points, graph }) {
    const features = [];

    points.forEach((ll) => {
        if (ll) {
            const [lat, lng] = ll.split(',');
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [lng, lat],
                },
            });
        }
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
