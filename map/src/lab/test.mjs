'use strict';

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { testRoute, mapToGraph } from './route.mjs';

// const test = '50.40498,30.61149 50.42361,30.47127'; // Kiev = 13324.33
// const test = '50.40598,30.61559 50.45771,30.52372'; // Kiev = 11355.59
// const test = '50.40498,30.61149 50.45971,30.52572'; // Kiev = 10885.33 (A* problem)

// const test = [
//     '50.35028,30.61581 50.51517,30.36484', // Kiev = 30361.32 (A* problem)
//     /* http://localhost:3000/map/?start=50.35028,30.61581&finish=50.51517,30.36484&type=osrm&profile=line#12/50.4202/30.5834 */
//     [
//         { uniqueQueued: 73958, maxQueueSize: 80299, totalChecked: 95593, distance: 30361.32 },
//         { uniqueQueued: 72302, maxQueueSize: 78459, totalChecked: 93409, distance: 30361.32 },
//         { uniqueQueued: 55810, maxQueueSize: 60393, totalChecked: 71513, distance: 30361.309999999998 },
//         { uniqueQueued: 26599, maxQueueSize: 29344, totalChecked: 33596, distance: 30361.32 },
//         { uniqueQueued: 37580, maxQueueSize: 41435, totalChecked: 47869, distance: 30361.32 },
//         { uniqueQueued: 25799, maxQueueSize: 28243, totalChecked: 32896, distance: 30361.31 },
//     ],
// ];

const test = [
    '50.427987,30.544395 50.470835,30.476761', // Kiev = 8216.18 (A* problem)
    /* http://localhost:3000/map/?start=50.427987,30.544395&finish=50.470835,30.476761&type=osrm&profile=line#12/50.4202/30.5834 */
    [
        { uniqueQueued: 24020, maxQueueSize: 25758, totalChecked: 30015, distance: 8216.18 },
        { uniqueQueued: 30341, maxQueueSize: 32670, totalChecked: 38329, distance: 8216.18 },
        { uniqueQueued: 13820, maxQueueSize: 14686, totalChecked: 16832, distance: 8216.17 },
        { uniqueQueued: 5473, maxQueueSize: 5804, totalChecked: 6333, distance: 8216.18 },
        { uniqueQueued: 5981, maxQueueSize: 6343, totalChecked: 6948, distance: 8216.18 },
        { uniqueQueued: 5572, maxQueueSize: 5906, totalChecked: 6539, distance: 8216.18 },
    ],
];

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
