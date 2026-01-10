import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { HeatmapDataPoint } from '../types';

const Analytics: React.FC = () => {
  const d3Container = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (d3Container.current) {
      // Clear previous SVG content if any
      d3.select(d3Container.current).selectAll("*").remove();

      // Mock Data for Heatmap (Logistics Cost per Region)
      const data: HeatmapDataPoint[] = [];
      const rows = 10;
      const cols = 15;
      
      for(let r=0; r<rows; r++) {
        for(let c=0; c<cols; c++) {
            data.push({
                region: `Zone ${r}-${c}`,
                value: Math.floor(Math.random() * 100),
                x: c,
                y: r
            });
        }
      }

      // Dimensions
      const margin = { top: 30, right: 30, bottom: 30, left: 30 };
      const width = 800 - margin.left - margin.right;
      const height = 400 - margin.top - margin.bottom;

      const svg = d3.select(d3Container.current)
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // Scales
      const x = d3.scaleBand()
        .range([0, width])
        .domain(Array.from({length: cols}, (_, i) => i.toString()))
        .padding(0.05);

      const y = d3.scaleBand()
        .range([height, 0])
        .domain(Array.from({length: rows}, (_, i) => i.toString()))
        .padding(0.05);

      // Color Scale (Blue intensity for cost)
      const myColor = d3.scaleLinear<string>()
        .range(["#f0f9ff", "#075985"])
        .domain([1, 100]);

      // Tooltip
      const tooltip = d3.select("body")
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "1px")
        .style("border-color", "#ccc")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("font-size", "0.8rem");

      // Draw squares
      svg.selectAll()
        .data(data, (d: any) => d.x + ':' + d.y)
        .enter()
        .append("rect")
        .attr("x", (d) => x(d.x.toString()) || 0)
        .attr("y", (d) => y(d.y.toString()) || 0)
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", (d) => myColor(d.value))
        .style("rx", 4)
        .style("ry", 4)
        .on("mouseover", function(event, d) {
            d3.select(this).style("stroke", "black").style("stroke-width", 2);
            tooltip.style("opacity", 1);
            tooltip.html(`Concentrazione Logistica<br>Valore: ${d.value}`)
               .style("left", (event.pageX + 10) + "px")
               .style("top", (event.pageY - 10) + "px");
        })
        .on("mousemove", function(event) {
            tooltip
               .style("left", (event.pageX + 10) + "px")
               .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseleave", function() {
            d3.select(this).style("stroke", "none");
            tooltip.style("opacity", 0);
        });

      // Add Title
      svg.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .style("font-size", "14px")
        .style("fill", "#64748b")
        .style("font-weight", "bold")
        .text("Mappa Geospaziale Costi Logistici (Heatmap)");
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Business Intelligence</h2>
        <p className="text-slate-500 text-sm">Analisi Dati & Trend</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
         <div className="w-full overflow-x-auto flex justify-center">
             <svg ref={d3Container}></svg>
         </div>
         <p className="mt-4 text-xs text-slate-400 text-center">
             Visualizzazione generata tramite D3.js su dataset logistico simulato.
         </p>
      </div>
    </div>
  );
};

export default Analytics;