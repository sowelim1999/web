'use strict';

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { testRoute, mapToGraph } from './route.mjs';

// const test = '50.40498,30.61149 50.45971,30.52572'; // Kiev
// const test = '37.80502,-122.43040 37.80083,-122.41001'; // SF
// const test = '42.43648,1.47431 42.63151,1.48114'; // Andorra
// const test = '43.73141,7.41888 43.74659,7.43895'; // Monaco not found
const test = '43.74659,7.43895 43.73141,7.41888'; // Monaco not found (rev)

const [start, finish] = test.split(' ');
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

const { geometry } = testRoute({ graph, startPoint, finishPoint });

console.log(!!geometry);
