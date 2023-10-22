'use strict';

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { testRoute, mapToGraph } from './route.mjs';

// const test = '50.40498,30.61149 50.42361,30.47127'; // Kiev = 13324.33
// const test = '50.40598,30.61559 50.45771,30.52372'; // Kiev = 11355.59
// const test = '50.40498,30.61149 50.45971,30.52572'; // Kiev = 10885.33 (A* problem)

// Dijkstra direct 4.9 run per second
// Dijkstra reverse 9.12 run per second
// A* direct 10.21 run per second
// A* reverse 7.12 run per second

const test = [
    '50.35028,30.61581 50.51517,30.36484', // Kiev = 30361.32 (A* problem)
    /* http://localhost:3000/map/?start=50.35028,30.61581&finish=50.51517,30.36484&type=osrm&profile=line#12/50.4202/30.5834 */
    [
        { uniqueQueued: 73958, maxQueueSize: 80299, totalChecked: 95593, distance: 30361.32 }, // 990 115 145
        { uniqueQueued: 72302, maxQueueSize: 78459, totalChecked: 93409, distance: 30361.32 }, // 790 220 265
        { uniqueQueued: 55805, maxQueueSize: 603, totalChecked: 67566, distance: 30361.32 }, // 671 ->
        { uniqueQueued: 26599, maxQueueSize: 29344, totalChecked: 33596, distance: 30361.32 }, // 980 110 152
        { uniqueQueued: 37580, maxQueueSize: 41435, totalChecked: 47869, distance: 30361.32 }, // 1330 131 165
        { uniqueQueued: 25972, maxQueueSize: 994, totalChecked: 31322, distance: 30361.31 }, // 705 ->
    ],
];

// const test = [
//     '50.427987,30.544395 50.470835,30.476761', // Kiev = 8216.18 (A* problem)
//     /* http://localhost:3000/map/?start=50.427987,30.544395&finish=50.470835,30.476761&type=osrm&profile=line#12/50.4202/30.5834 */
//     [
//         { maxQueueSize: 484, uniqueQueued: 24019, totalChecked: 28568, distance: 8216.18 },
//         { maxQueueSize: 481, uniqueQueued: 30340, totalChecked: 36321, distance: 8216.18 },
//         { maxQueueSize: 370, uniqueQueued: 13822, totalChecked: 16124, distance: 8216.18 },
//         { maxQueueSize: 299, uniqueQueued: 5472, totalChecked: 6118, distance: 8216.18 },
//         { maxQueueSize: 297, uniqueQueued: 5980, totalChecked: 6698, distance: 8216.18 },
//         { maxQueueSize: 373, uniqueQueued: 5407, totalChecked: 6105, distance: 8216.18 },
//     ],
// ];

// const test = '37.80502,-122.43040 37.80083,-122.41001'; // SF
// const test = '42.43648,1.47431 42.63151,1.48114'; // Andorra
// const test = '43.73141,7.41888 43.74659,7.43895'; // Monaco (start not found)
// const test = '43.74659,7.43895 43.73141,7.41888'; // Monaco (start not found, rev)

const ll = typeof test === 'string' ? test : test[0];
const matchArray = typeof test === 'string' ? [] : test[1];

const [start, finish] = ll.split(' ');
const startPoint = { lat: start.split(',')[0], lng: start.split(',')[1] };
const finishPoint = { lat: finish.split(',')[0], lng: finish.split(',')[1] };

const args = process.argv.slice(2);

// generate
if (args[0] && existsSync(args[0])) {
    const data = readFileSync(args[0]);
    const graph = mapToGraph(JSON.parse(data));
    writeFileSync('./json/graph.json', JSON.stringify(graph));
}

// start-finish by args
if (args[0] && args[1]) {
    startPoint.lat = args[0].split(',')[0];
    startPoint.lng = args[0].split(',')[1];
    finishPoint.lat = args[1].split(',')[0];
    finishPoint.lng = args[1].split(',')[1];
}

const graph = JSON.parse(readFileSync('./json/graph.json'));

const { geometry } = testRoute({ graph, matchArray, startPoint, finishPoint });

console.log(!!geometry);
