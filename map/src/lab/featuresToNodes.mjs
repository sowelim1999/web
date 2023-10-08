'use strict';

import { LL_ROUND } from './utils.mjs';

/**
 * @name featuresToNodes
 * @params { features } (GeoJSON features)
 * @return ["lat,lng"] Array of strings as nodes
 *
 * Cycle on GeoJSON LineString features.
 * Map all points.toFixed(5) into ll["lat,lng"] to find intersections.
 * Map the LineString edges (1st, last points) to include them as nodes.
 * Finally, return nodes(vertices) by filtering Map for 2+ points counted.
 */
export function featuresToNodes({ features }) {
    const latlng = {};

    features.forEach((f) => {
        if (f?.geometry?.type === 'LineString' && f?.geometry?.coordinates?.length > 0) {
            f.geometry.coordinates.forEach(([lng, lat], i, all) => {
                const ll = lat.toFixed(LL_ROUND) + ',' + lng.toFixed(LL_ROUND);
                latlng[ll] || (latlng[ll] = 0); // init latlng map
                i === all.length - 1 && latlng[ll]++; // last
                i === 0 && latlng[ll]++; // first
                latlng[ll]++; // any
            });
        }
    });

    return Object.keys(latlng).filter((k) => latlng[k] >= 2);
}
