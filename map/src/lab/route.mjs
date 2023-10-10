'use strict';

const MEASURE = 0;

const RADIUS_START = 100000; // filterGraph radius (m)
const RADIUS_EXPAND = RADIUS_START / 2; // (m)
const RADIUS_MAX = 100000; // (m)

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
    console.log('map Nodes/Graph', mapNodes.length, Object.keys(mapGraph).length, 'filled with', segments, 'segments');

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
        console.log(cycles, 'radius', radius, 'graph', Object.keys(graph).length, 'filled with', segments, 'segments');

        const result = measure(() => aStar({ graph, startNodeLL, finishNodeLL }), 'aStar()', MEASURE);
        // const result = measure(() => aStar({ graph, finishNodeLL, startNodeLL }), 'aStar()', MEASURE);

        if (result) {
            const { points } = result;

            return {
                points, // geometry of the route
                debugGeoJSON: makeGeoJSON({ points: [startNodeLL, finishNodeLL], graph: {} }),
                // debugGeoJSON: makeGeoJSON({ points: [startNodeLL, finishNodeLL], graph: graph }),
                // debugGeoJSON: makeGeoJSON({ points: mapNodes, graph: graph }),
            };
        }

        const filteredCount = Object.keys(graph).length + Object.keys(ignoreNodes).length;

        // stop when full mapGraph was already processed
        if (filteredCount >= Object.keys(mapGraph).length) {
            break;
        }
    }

    // check is graph fully connected (?)
    // prioritize graph by distance to A/B
    // when it's connected, call A*

    throw new Error('no route found');
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
