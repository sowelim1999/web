'use strict';

import { readFileSync } from 'node:fs';
import { testRoute } from './route.mjs';

// Monaco
/*
    node test.mjs 43.73141,7.41888 43.74659,7.43895 # route not found
    node test.mjs 43.74659,7.43895 43.73141,7.41888 # route not found (rev)
*/
const map = JSON.parse(readFileSync('./test_monaco.json'));
const startPoint = { lat: 43.72807, lng: 7.4238 };
const finishPoint = { lat: 43.74659, lng: 7.43895 };

// Andorra
// const map = JSON.parse(readFileSync('./test_andorra.json'));
// const startPoint = { lat: 42.43648, lng: 1.47431 }; // 42.43648, 1.47431
// const finishPoint = { lat: 42.63151, lng: 1.48114 }; // 42.63151, 1.48114

// San Francisco square
// const map = JSON.parse(readFileSync('./test_sf_square.json'));
// const startPoint = { lat: 37.80503706092163, lng: -122.43021368980409 };
// const finishPoint = { lat: 37.800828177295934, lng: -122.41002202033998 };

const args = process.argv.slice(2);

if (args[0] && args[1]) {
    startPoint.lat = args[0].split(',')[0];
    startPoint.lng = args[0].split(',')[1];
    finishPoint.lat = args[1].split(',')[0];
    finishPoint.lng = args[1].split(',')[1];
}

const { geometry } = testRoute({ map, startPoint, finishPoint });

console.log(!!geometry);
