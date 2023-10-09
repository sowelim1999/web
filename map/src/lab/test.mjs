'use strict';

import { readFileSync } from 'node:fs';
import { testRoute } from './route.mjs';
const map = JSON.parse(readFileSync('./test_andorra.json'));

// andorra
const startPoint = { lat: 42.43648, lng: 1.47431 }; // 42.43648, 1.47431
const finishPoint = { lat: 42.63151, lng: 1.48114 }; // 42.63151, 1.48114

// sf
// const startPoint = { lat: 37.80503706092163, lng: -122.43021368980409 };
// const finishPoint = { lat: 37.800828177295934, lng: -122.41002202033998 };

const { points } = testRoute({ map, startPoint, finishPoint });

console.log(points);
