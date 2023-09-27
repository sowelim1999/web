import GpxGraphProvider from "./GpxGraphProvider";
import React, {useContext, useEffect, useMemo, useState} from "react";
import AppContext from "../../../context/AppContext";
import _ from "lodash";
import {ELEVATION, ELEVATION_SRTM, isSrtmAppeared, SLOPE, SPEED} from "../../../manager/GraphManager";
import {equalsPoints, getAllPoints, getTrackPoints} from "../../../manager/TracksManager";
import {seleniumUpdateActivity} from "../../../util/Utils";

export default function Graph() {

    const ctx = useContext(AppContext);

    const [data, setData] = useState(null);
    const [roadPoints, setRoadPoints] = useState(null);
    const [showData, setShowData] = useState(null);

    function getPoints() {
        let points = !_.isEmpty(ctx.selectedGpxFile.points)
            ? getAllPoints(ctx.selectedGpxFile.points)
            : getTrackPoints(ctx.selectedGpxFile);
        if (!_.isEmpty(points) && points[0].segment && !equalsPoints(points, roadPoints)) {
            setRoadPoints(points);
        } else if (_.isEmpty(points) || points[0].segment === undefined) {
            setRoadPoints(null);
        }
        return points ? points : [];
    }

    useEffect(() => {
        if (data) {
            let newShowData = {};
            if (data.ele) {
                newShowData[ELEVATION] = data.ele;
            }
            if (data.srtm) {
                newShowData[ELEVATION_SRTM] = data.srtm;
            }
            if (data.speed) {
                newShowData[SPEED] = showData && showData[SPEED] ? true : '';
            }
            if (data.slope) {
                newShowData[SLOPE] = showData && showData[SLOPE] ? true : '';
            }
            setShowData(newShowData);
            seleniumUpdateActivity();
        }
    }, [data]);


    useEffect(() => {
        if (ctx.selectedGpxFile) {
            let trackData = {};
            let points = getPoints();
            if (!_.isEmpty(points) && (isSrtmAppeared(trackData, ctx) || !equalsPoints(points, data?.data))) {
                if (ctx.selectedGpxFile.analysis?.hasElevationData) {
                    trackData.ele = true;
                    trackData.slope = true;
                    trackData.data = points;
                }
                if (ctx.selectedGpxFile.analysis?.srtmAnalysis) {
                    trackData.srtm = true;
                    if (!trackData.data) {
                        trackData.data = points;
                    }
                }
                if (ctx.selectedGpxFile?.analysis?.hasSpeedData) {
                    trackData.speed = true;
                    if (!trackData.data) {
                        trackData.data = points;
                    }
                }
                setData({ ...trackData });
            } else if (_.isEmpty(points)) {
                setData(null);
            }
        } else {
            setData(null);
            setRoadPoints(null);
        }
    }, [ctx.selectedGpxFile]);

    return useMemo(() => {
        console.log(data)
    return <GpxGraphProvider width={ctx.infoBlockWidth} data={data} roadPoints={roadPoints} showData={showData}/>
    }, [
        data, showData
    ]);
}