'use strict';

import { measure, getDistance } from './utils.mjs';

export function testRoute({ map, startPoint, finishPoint }) {
    const dist = () => getDistance(startPoint.lat, startPoint.lng, finishPoint.lat, finishPoint.lng);

    console.log('start', startPoint);
    console.log('finish', finishPoint);
    console.log('dist', measure(dist, 'dist', 100));
    console.log('map', Object.keys(map).length);

    return {
        points: [
            [startPoint.lng, startPoint.lat],
            [finishPoint.lng, finishPoint.lat],
        ],
        debugGeoJSON: map,
    };
}
