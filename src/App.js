import './App.css';
import React, { useEffect, useMemo } from 'react';
import * as d3 from 'd3';
const venn = require('venn.js'); // Using require instead of import

function App() {

  const sets = useMemo(() => [
    { sets: ['WB-mRNA-1'], size: 275 },
    { sets: ['biopsy-mRNA'], size: 115 },
    { sets: ['WB-mRNA-2'], size: 74 },
    { sets: ['WB-mRNA-1', 'biopsy-mRNA'], size: 73 },
    { sets: ['WB-mRNA-1', 'WB-mRNA-2'], size: 2 },
    { sets: ['biopsy-mRNA', 'WB-mRNA-2'], size: 1 },
    { sets: ['WB-mRNA-1', 'biopsy-mRNA', 'WB-mRNA-2'], size: 0 }
  ], []);

  useEffect(() => {
    // Draw Venn diagram
    var div = d3.select("#venn");
    div.datum(sets).call(venn.VennDiagram().width(500).height(500));

    // Add a tooltip
    var tooltip = d3.select("body").append("div")
      .attr("class", "venntooltip")
      .style("position", "absolute")
      .style("text-align", "center")
      .style("width", "128px")
      .style("height", "16px")
      .style("background", "#333")
      .style("color", "#ddd")
      .style("padding", "2px")
      .style("border", "0px")
      .style("border-radius", "8px")
      .style("opacity", 0);

    div.selectAll("path")
      .style("stroke-opacity", 0)
      .style("stroke", "#fff")
      .style("stroke-width", 3);

    // Add listeners to all the groups to display tooltip on mouseover
    div.selectAll("g")
      .on("mouseover", function(event, d) {
        if (!d || !d.sets) return;

        // Sort all the areas relative to the current item
        venn.sortAreas(div, d);

        // Display a tooltip with the current size
        tooltip.transition().duration(400).style("opacity", .9);
        tooltip.text(d.size + " subjects");

        // Highlight the current path
        div.selectAll("path")
          .style("fill-opacity", function(e) {
            return e.sets.length === 1 ? .25 : .0;
          })
          .style("stroke-opacity", 0);

        var selection = d3.select(this).transition("tooltip").duration(400);
        selection.select("path")
          .style("fill-opacity", d.sets.length === 1 ? .4 : .1)
          .style("stroke-width", 5)  // Make the white border thicker
          .style("stroke-opacity", 1);
      })
      .on("mousemove", function(event) {
        tooltip.style("left", (event.pageX) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function(event, d) {
        if (!d || !d.sets) return;

        tooltip.transition().duration(400).style("opacity", 0);

        // Reset styles to default
        div.selectAll("path")
          .transition("tooltip").duration(400)
          .style("fill-opacity", function(e) {
            return e.sets.length === 1 ? .25 : .0;
          })
          .style("stroke-opacity", 0)
          .style("stroke-width", 3);  // Reset to default thickness
      });
  }, [sets]);

  return (
    <div className="App" style={{ width: '100%', height: '400px' }}>
      <h1>Med.ai IMM Data Explorer Venn Diagram Redesign </h1>
      <h2> Studies by Disease > CERTIFI </h2>
        <div id="venn" style={{ width: '100%', height: '400px' }}></div>
      </div>
  );
}

export default App;
