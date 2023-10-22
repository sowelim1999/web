'use strict';

const MEASURE = 0;

import { measure } from './utils.mjs';

import { aStar } from './aStar.mjs';
import { aStarBi } from './aStarBi.mjs';
import { featuresToNodes } from './featuresToNodes.mjs';
import { featuresToWeightedGraph } from './featuresToWeightedGraph.mjs';
import { findStartFinishNodes } from './findStartFinishNodes.mjs';

const nVertices = (graph) => Object.keys(graph).length;
const nEdges = (graph) => Object.keys(graph).reduce((a, p) => a + graph[p].length, 0);

export function testRoute({ graph, startPoint, finishPoint, matchArray = [], web = false }) {
    console.log('graph vertices', nVertices(graph), 'edges', nEdges(graph));

    let cycle = 0;
    const avoidNodes = {};

    const uniqueDistances = {}; // just to colorize when routers return different distances

    for (;;) {
        cycle++;

        let startNodeLL, finishNodeLL;

        if (web === false) {
            ({ startNodeLL, finishNodeLL } = measure(
                () => findStartFinishNodes({ graph, avoidNodes, startPoint, finishPoint }),
                'find()',
                MEASURE
            ));
        }

        const ROUTERS = [
            {
                name: 'Dijkstra direct',
                f: () => aStar({ graph, src: startNodeLL, dst: finishNodeLL, avoidHeuristics: true }),
            },
            {
                name: 'Dijkstra reverse',
                reversed: true,
                f: () => aStar({ graph, src: finishNodeLL, dst: startNodeLL, avoidHeuristics: true }),
            },
            {
                name: 'Dijkstra Two-Way',
                f: () => aStarBi({ graph, src: startNodeLL, dst: finishNodeLL, avoidHeuristics: true }),
            },
            { name: 'A* direct', f: () => aStar({ graph, src: startNodeLL, dst: finishNodeLL }) },
            { name: 'A* reverse', reversed: true, f: () => aStar({ graph, src: finishNodeLL, dst: startNodeLL }) },
            { name: 'A* Two-Way', f: () => aStarBi({ graph, src: startNodeLL, dst: finishNodeLL }) },
        ];

        let geometry, alternative, failedAtStart, failedAtFinish, debug;

        for (const { name, f, reversed } of ROUTERS) {
            if (web === true) {
                // for web, every cycle call find to cleanup graph.edge.debug (just for debug)
                ({ startNodeLL, finishNodeLL } = measure(
                    () => findStartFinishNodes({ graph, avoidNodes, startPoint, finishPoint }),
                    'find()',
                    MEASURE
                ));
            }

            ({ geometry, alternative, failedAtStart, failedAtFinish, debug } = measure(f, name, MEASURE));
            console.log(cycle, name, !!geometry, debug.toString());
            matchArray.length > 0 && checkMatchArray({ debug, matchArray });

            uniqueDistances[debug.distance.toFixed(0)] = true;

            // route not found
            // try to avoid node
            if (geometry === null) {
                const n = nVertices(graph);
                const q = debug.uniqueQueued || Infinity;

                if (failedAtStart) {
                    avoidNodes[startNodeLL] = true; // aStarBi() failed
                } else if (failedAtFinish) {
                    avoidNodes[finishNodeLL] = true; // aStarBi() failed
                } else if (q < n * 0.1) {
                    avoidNodes[reversed ? finishNodeLL : startNodeLL] = true; // aStar() assume start failed
                } else if (q > n * 0.9) {
                    avoidNodes[reversed ? startNodeLL : finishNodeLL] = true; // aStar() assume finish failed
                }

                continue;
            }
        }

        if (geometry) {
            return {
                geometry, // geometry of the route
                debugGeoJSON: makeGeoJSON({
                    graph, // show graph (debug)
                    debugOnly: true, // show only queued (debug)
                    alternative: alternative ?? null, // show alternative geometry (debug)
                    points: [startNodeLL, finishNodeLL], // show start/finish points (debug)
                    uniqueDistances, // debug (red color if more than 1 unique distance found)
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

export function mapToGraph(map) {
    const features = map.features;

    // nodes & graph are independent on start/finish, so they should be pre-generated
    const nodes = measure(() => featuresToNodes({ features }), 'nodes()', MEASURE);
    const graph = measure(() => featuresToWeightedGraph({ features, nodes }), 'graph()', MEASURE);
    console.log('map nodes', nodes.length, 'vertices', nVertices(graph), 'edges', nEdges(graph));

    return graph;
}

function makeGeoJSON({ points, alternative, graph, debugOnly = false, uniqueDistances }) {
    const features = [];

    const fault = Object.keys(uniqueDistances).length > 1;

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
                        style: { weight: 1, color: fault ? 'red' : 'green' },
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

function checkMatchArray({ debug, matchArray }) {
    const checkfields = {};
    matchArray.forEach((m) => Object.keys(m).forEach((k) => (checkfields[k] = true)));

    const debugJSON = JSON.stringify(
        Object.keys(debug)
            .filter((k) => checkfields[k])
            .sort()
            .map((k) => ({ [k]: debug[k] }))
    );

    const matchArrayJSON = [];

    matchArray.forEach((m) => {
        matchArrayJSON.push(
            JSON.stringify(
                Object.keys(m)
                    .filter((k) => checkfields[k])
                    .sort()
                    .map((k) => ({ [k]: m[k] }))
            )
        );
    });

    if (matchArrayJSON.some((json) => json === debugJSON)) {
        return true;
    }

    throw new Error('match failed: ' + debugJSON);
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
