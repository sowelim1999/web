import {Chart} from "react-chartjs-2";
import React, {useMemo} from "react";

export default function ChartMemo(graphData, options, mouseLine, chartRef, onMouseMoveGraph, hideSelectedPoint) {

    return useMemo(() => {
    return <Chart
        ref={chartRef}
        style={{ fontSize: 10 }}
        data={graphData}
        options={options}
        plugins={[mouseLine]}
        onMouseMove={(e) => onMouseMoveGraph(e, chartRef)}
        onMouseLeave={() => hideSelectedPoint()}
    />
    }, [
        graphData, options
    ]);
}