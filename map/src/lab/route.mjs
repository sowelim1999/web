'use strict';

const MEASURE = 0;

const RADIUS_START = 100000; // filterGraph radius (m)
const RADIUS_EXPAND = RADIUS_START / 2; // (m)
const RADIUS_MAX = 100000; // (m)

const TEST_REVERSE = true;

import { aStar } from './aStar.mjs';
import { filterGraph } from './filterGraph.mjs';
import { featuresToNodes } from './featuresToNodes.mjs';
import { featuresToWeightedGraph } from './featuresToWeightedGraph.mjs';

import { measure } from './utils.mjs';

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
    console.log('map nodes', mapNodes.length, 'graph', Object.keys(mapGraph).length, 'edges', segments);

    let cycles = 0;
    const ignoreNodes = {}; // used to find better startNode/finishNode every cycle

    for (let radius = RADIUS_START; radius <= RADIUS_MAX; radius += RADIUS_EXPAND) {
        cycles++;

        const { graph, startNodeLL, finishNodeLL } = measure(
            () => filterGraph({ graph: mapGraph, radius, startPoint, finishPoint, ignoreNodes }),
            `filter() [${radius} m]`,
            MEASURE
        );

        // XXX think about better way
        // ignoreNodes[startNodeLL] = true;
        // ignoreNodes[finishNodeLL] = true;

        const segments = Object.keys(graph).reduce((a, p) => a + graph[p].length, 0);
        console.log('cycle', cycles, 'radius', radius, 'graph', Object.keys(graph).length, 'edges', segments);

        const result = measure(() => aStar({ graph, startNodeLL, finishNodeLL }), 'aStar()', MEASURE);

        const { points, debug } = result;
        console.log('A* direct', !!points, debug);

        if (points) {
            if (TEST_REVERSE) {
                const reverse = measure(
                    () => aStar({ graph, startNodeLL: finishNodeLL, finishNodeLL: startNodeLL }),
                    'aStar-reverse()',
                    MEASURE
                );

                const { points, debug } = reverse;
                console.log('A* reverse', !!points, debug);
            }

            return {
                points, // geometry of the route
                debugGeoJSON: makeGeoJSON({ points: [startNodeLL, finishNodeLL], graph, debugOnly: true }),
            };
        }

        const filteredCount = Object.keys(graph).length + Object.keys(ignoreNodes).length;

        // stop cycle when full mapGraph was already processed
        if (filteredCount >= Object.keys(mapGraph).length) {
            break;
        }
    }

    console.log('no route found');

    return {
        points: [],
        debugGeoJSON: makeGeoJSON({ points: mapNodes, graph: {} }),
    };
}

function makeGeoJSON({ points, graph, debugOnly = false }) {
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
            if (debugOnly === false || e.debug) {
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
            }
        });
    });

    return {
        type: 'FeatureCollection',
        features,
    };
}
