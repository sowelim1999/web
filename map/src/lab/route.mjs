'use strict';

import { measure, getDistance } from './utils.mjs';

export function testRoute({ map, startPoint, finishPoint }) {
    // const dist = () => getDistance(startPoint.lat, startPoint.lng, finishPoint.lat, finishPoint.lng);

    startPoint && true;
    finishPoint && true;
    getDistance && true;

    const vertices = measure(() => findVertices(map.features), 'vertices');
    console.log(vertices.length);

    const debugPoints = vertices;

    const debugGeoJSON = makeGeoJSON({ points: debugPoints });

    return {
        debugGeoJSON,
        points: [
            [startPoint.lng, startPoint.lat],
            [finishPoint.lng, finishPoint.lat],
        ],
    };
}

function findVertices(features) {
    const latlng = {};

    features.forEach((f) => {
        if (f?.geometry?.type === 'LineString' && f?.geometry?.coordinates?.length > 0) {
            f.geometry.coordinates.forEach(([lng, lat], i, all) => {
                const ll = lat.toFixed(5) + ',' + lng.toFixed(5);
                latlng[ll] || (latlng[ll] = 0); // init latlng map
                i === all.length - 1 && latlng[ll]++; // last
                i === 0 && latlng[ll]++; // first
                latlng[ll]++; // any
            });
        }
    });

    return Object.keys(latlng).filter((k) => latlng[k] >= 2);
}

function makeGeoJSON({ points }) {
    const features = [];
    points.forEach((ll) => {
        const [lat, lng] = ll.split(',');
        features.push({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [lng, lat],
            },
        });
    });
    return {
        type: 'FeatureCollection',
        features,
    };
}
