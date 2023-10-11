'use strict';

const MEASURE = 0;

const TEST_REVERSE = true;

import { measure } from './utils.mjs';

import { aStar } from './aStar.mjs';
import { featuresToNodes } from './featuresToNodes.mjs';
import { featuresToWeightedGraph } from './featuresToWeightedGraph.mjs';
import { findStartFinishNodes } from './findStartFinishNodes.mjs';

const ROUTER = aStar;

const nVertices = (graph) => Object.keys(graph).length;
const nEdges = (graph) => Object.keys(graph).reduce((a, p) => a + graph[p].length, 0);

export function testRoute({ map, startPoint, finishPoint }) {
    const features = map.features;

    // nodes & graph are independent on start/finish, so they should be pre-generated
    const nodes = measure(() => featuresToNodes({ features }), 'nodes()', MEASURE);
    const graph = measure(() => featuresToWeightedGraph({ features, nodes }), 'graph()', MEASURE);
    console.log('map nodes', nodes.length, 'vertices', nVertices(graph), 'edges', nEdges(graph));

    let cycle = 0;
    const avoidNodes = {};

    for (;;) {
        cycle++;

        const { startNodeLL, finishNodeLL } = measure(
            () => findStartFinishNodes({ graph, avoidNodes, startPoint, finishPoint }),
            'find()',
            MEASURE
        );

        const { geometry, debug } = measure(() => ROUTER({ graph, startNodeLL, finishNodeLL }), 'router()', MEASURE);
        console.log(cycle, 'direct', !!geometry, debug);

        // route not found
        // try to avoid node
        if (geometry === null) {
            // XXX think about better way to avoid orhpans
            debug.queued < nVertices(graph) * 0.1 && (avoidNodes[startNodeLL] = true);
            debug.queued > nVertices(graph) * 0.9 && (avoidNodes[finishNodeLL] = true);
            continue;
        }

        if (geometry) {
            let alternative = null; // geometry
            if (TEST_REVERSE) {
                const { geometry, debug } = measure(
                    () => ROUTER({ graph, startNodeLL: finishNodeLL, finishNodeLL: startNodeLL }),
                    'router-reverse()',
                    MEASURE
                );
                console.log(cycle, 'reverse', !!geometry, debug);
                geometry && (alternative = geometry); // debug reverse
            }

            return {
                geometry, // geometry of the route
                debugGeoJSON: makeGeoJSON({
                    graph, // show graph (debug)
                    debugOnly: true, // show only queued (debug)
                    alternative, // show alternative geometry (debug)
                    points: [startNodeLL, finishNodeLL], // show start/finish points (debug)
                }),
            };
        }
    }
    // console.log('route not found');

    // return {
    //     geometry: [],
    //     debugGeoJSON: makeGeoJSON({ points: nodes, graph: {} }),
    // };
}

function makeGeoJSON({ points, alternative, graph, debugOnly = false }) {
    const features = [];

    points &&
        points.forEach((ll) => {
            if (ll) {
                const [lat, lng] = ll.split(',');
                features.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [lng, lat],
                    },
                    style: { color: 'yellow' },
                });
            }
        });

    graph &&
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
                        style: { weight: 1, color: 'green' },
                    });
                }
            });
        });

    alternative &&
        features.push({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: alternative,
            },
            style: { weight: 3, color: 'blue' },
        });

    return {
        type: 'FeatureCollection',
        features,
    };
}

// const RADIUS_START = 100000; // filterGraph radius (m)
// const RADIUS_EXPAND = RADIUS_START / 2; // (m)
// const RADIUS_MAX = 100000; // (m)

// export function testRoute({ map, startPoint, finishPoint }) {
//     const features = map.features;

//     // nodes & graph are independent on start/finish, so they should be pre-generated
//     const mapNodes = measure(() => featuresToNodes({ features }), 'nodes()', MEASURE);
//     const mapGraph = measure(() => featuresToWeightedGraph({ features, nodes: mapNodes }), 'graph()', MEASURE);

//     console.log('map nodes', mapNodes.length, 'vertices', nVertices(mapGraph), 'edges', nEdges(mapGraph));

//     let cycles = 0;
//     const ignoreNodes = {}; // used to find better startNode/finishNode every cycle

//     for (let radius = RADIUS_START; radius <= RADIUS_MAX; radius += RADIUS_EXPAND) {
//         cycles++;

//         const { graph, startNodeLL, finishNodeLL } = measure(
//             () => filterGraph({ graph: mapGraph, radius, startPoint, finishPoint, ignoreNodes }),
//             `filter() [${radius} m]`,
//             MEASURE
//         );

//         // XXX think about better way to deal with non-routable start/end nodes
//         // ignoreNodes[startNodeLL] = true;
//         // ignoreNodes[finishNodeLL] = true;

//         console.log('cycle', cycles, 'radius', radius, 'vertices', nVertices(graph), 'edges', nEdges(graph));

//         const result = measure(() => ROUTER({ graph, startNodeLL, finishNodeLL }), 'router()', MEASURE);

//         const { geometry, debug } = result;
//         console.log('direct', !!geometry, debug);

//         if (geometry) {
//             let alternative = null; // geometry
//             if (TEST_REVERSE) {
//                 const reverse = measure(
//                     () => ROUTER({ graph, startNodeLL: finishNodeLL, finishNodeLL: startNodeLL }),
//                     'router-reverse()',
//                     MEASURE
//                 );

//                 const { geometry, debug } = reverse;
//                 console.log('reverse', !!geometry, debug);
//                 geometry && (alternative = geometry); // debug reverse
//             }

//             return {
//                 geometry, // geometry of the route
//                 debugGeoJSON: makeGeoJSON({
//                     graph, // show graph (debug)
//                     debugOnly: true, // show only queued (debug)
//                     alternative, // show alternative geometry (debug)
//                     points: [startNodeLL, finishNodeLL], // show start/finish points (debug)
//                 }),
//             };
//         }

//         const filteredCount = Object.keys(graph).length + Object.keys(ignoreNodes).length;

//         // stop cycle when full mapGraph was already processed
//         if (filteredCount >= Object.keys(mapGraph).length) {
//             break;
//         }
//     }

//     console.log('route not found');

//     return {
//         geometry: [],
//         debugGeoJSON: makeGeoJSON({ points: mapNodes, graph: {} }),
//     };
// }
