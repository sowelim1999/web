'use strict';

import { readFileSync } from 'node:fs';
import { testRoute } from './route.mjs';
const map = JSON.parse(readFileSync('./map.json'));

const startPoint = {
    lat: 37.80503706092163,
    lng: -122.43021368980409,
};

const finishPoint = {
    lat: 37.800828177295934,
    lng: -122.41002202033998,
};

const { points } = testRoute({ map, startPoint, finishPoint });

console.log(points);
