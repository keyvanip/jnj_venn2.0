import './App.css';
import React, { useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { AgGridReact } from 'ag-grid-react';
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css"; // Use a common theme
import { ModuleRegistry } from "@ag-grid-community/core";
import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
import { RowGroupingModule } from "@ag-grid-enterprise/row-grouping";
const venn = require('venn.js'); // Using require instead of import

ModuleRegistry.registerModules([ClientSideRowModelModule, RowGroupingModule]);

function App() {
  const [highlightedSets, setHighlightedSets] = useState([]);
  const [hoverSize, setHoverSize] = useState(null);

  const sets = useMemo(() => [
    { sets: ['WB-mRNA-1'], size: 275 },
    { sets: ['biopsy-mRNA'], size: 115 },
    { sets: ['WB-mRNA-2'], size: 74 },
    { sets: ['WB-mRNA-1', 'biopsy-mRNA'], size: 73 },
    { sets: ['WB-mRNA-1', 'WB-mRNA-2'], size: 2 },
    { sets: ['biopsy-mRNA', 'WB-mRNA-2'], size: 1 },
    { sets: ['WB-mRNA-1', 'biopsy-mRNA', 'WB-mRNA-2'], size: 0 }
  ], []);

  const urlMap = {
    'WB-mRNA-1': 'https://immdatahub.jnj.com/dataexplorer/CERTIFI/WB-mRNA-1',
    'WB-mRNA-2': 'https://immdatahub.jnj.com/dataexplorer/CERTIFI/WB-mRNA-2',
    'biopsy-mRNA': 'https://immdatahub.jnj.com/dataexplorer/CERTIFI/biopsy-mRNA',
    'WB-mRNA-1,WB-mRNA-2': 'https://immdatahub.jnj.com/dataexplorer/CERTIFI/WB-mRNA-2.&.WB-mRNA-1',
    'WB-mRNA-2,biopsy-mRNA': 'https://immdatahub.jnj.com/dataexplorer/CERTIFI/WB-mRNA-2.&.biopsy-mRNA',
    'WB-mRNA-1,biopsy-mRNA': 'https://immdatahub.jnj.com/dataexplorer/CERTIFI/WB-mRNA-1.&.biopsy-mRNA',
    'WB-mRNA-1,biopsy-mRNA,WB-mRNA-2': 'https://immdatahub.jnj.com/dataexplorer/CERTIFI/WB-mRNA-1.&.biopsy-mRNA'
  };

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
      .on("mouseover", function (event, d) {
        if (!d || !d.sets) return;

        // Sort all the areas relative to the current item
        venn.sortAreas(div, d);

        // Display a tooltip with the current size
        tooltip.transition().duration(400).style("opacity", .9);
        tooltip.text(d.size + " subjects");

        // Highlight the current path
        div.selectAll("path")
          .style("fill-opacity", function (e) {
            return e.sets.length === 1 ? .25 : .0;
          })
          .style("stroke-opacity", 0);

        var selection = d3.select(this).transition("tooltip").duration(400);
        selection.select("path")
          .style("fill-opacity", d.sets.length === 1 ? .4 : .1)
          .style("stroke-width", 5)  // Make the white border thicker
          .style("stroke-opacity", 1);

        // Set highlighted sets and hover size for the table
        setHighlightedSets(d.sets);
        setHoverSize(d.size);
      })
      .on("mousemove", function (event) {
        tooltip.style("left", (event.pageX) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function (event, d) {
        if (!d || !d.sets) return;

        tooltip.transition().duration(400).style("opacity", 0);

        // Reset styles to default
        div.selectAll("path")
          .transition("tooltip").duration(400)
          .style("fill-opacity", function (e) {
            return e.sets.length === 1 ? .25 : .0;
          })
          .style("stroke-opacity", 0)
          .style("stroke-width", 3);  // Reset to default thickness

        // Reset highlighted sets and hover size for the table
        setHighlightedSets([]);
        setHoverSize(null);
      })
      .on("click", function (event, d) {
        if (!d || !d.sets) return;
        const key = d.sets.join(',');
        const url = urlMap[key];
        if (url) {
          window.location.href = url;
        }
      });
  }, [sets]);

  // Function to calculate and format the statistics table data
  const formatTableData = () => {
    const totalCounts = {};
    sets.forEach(set => {
      set.sets.forEach(s => {
        totalCounts[s] = (totalCounts[s] || 0) + set.size;
      });
    });

    const uniqueCounts = sets.filter(set => set.sets.length === 1).map(set => ({
      set: set.sets[0],
      count: set.size
    }));

    const overlapCounts = sets.filter(set => set.sets.length > 1).map(set => ({
      sets: set.sets.join(', '),
      count: set.size
    }));

    const data = Object.keys(totalCounts).map((key, index) => {
      const overlaps = overlapCounts.filter(o => o.sets.includes(key)).map(o => `${o.sets}: ${o.count}`).join('; ');
      return {
        set: key,
        total: totalCounts[key],
        unique: uniqueCounts.find(u => u.set === key)?.count || 0,
        overlap: overlaps,
        id: index
      };
    });

    return data;
  };

  const rowData = formatTableData().map(data => {
    const overlaps = data.overlap.split('; ').map(overlap => ({
      set: data.set,
      total: data.total,
      unique: data.unique,
      overlap: overlap,
      isHighlighted: (highlightedSets.length === 1 && highlightedSets[0] === data.set) ||
                     (highlightedSets.length > 1 && overlap.includes(`${highlightedSets.join(', ')}`) && parseInt(overlap.split(': ')[1]) === hoverSize)
    }));
    return overlaps;
  }).flat();

  const columnDefs = [
    { headerName: 'Set', field: 'set', sortable: true, filter: true, resizable: true },
    { headerName: 'Total Subjects', field: 'total', sortable: true, filter: 'agNumberColumnFilter', resizable: true },
    { headerName: 'Subjects Not Overlapping', field: 'unique', sortable: true, filter: 'agNumberColumnFilter', resizable: true },
    { headerName: 'Overlap with Other Sets', field: 'overlap', sortable: true, filter: true, resizable: true, rowGroup: true }
  ];

  const gridOptions = {
    columnDefs: columnDefs,
    defaultColDef: {
      flex: 1,
      minWidth: 100,
    },
    autoGroupColumnDef: {
      headerName: 'Overlap Group',
      minWidth: 200,
      cellRendererParams: {
        suppressCount: true
      }
    },
    getRowStyle: params => {
      if (params.data.isHighlighted) {
        return { backgroundColor: '#f8d7da' }; // Highlighted row style
      }
      return null;
    }
  };

  const groupDisplayType = 'multipleColumns';

  return (
    <div className="App" style={{ width: '100%', height: '400px' }}>
      <h1>Med.ai IMM Data Explorer Venn Diagram Redesign</h1>
      <h2>Studies by Disease > CERTIFI</h2>
      <div id="venn" style={{ width: '100%', height: '400px' }}></div>
      <div style={{ marginTop: '150px' }}></div>
      <div
        className="ag-theme-alpine" // Updated theme
        style={{ height: 400, width: '100%' }}
      >
        <AgGridReact
          gridOptions={gridOptions}
          rowData={rowData}
          groupDisplayType={'groupDisplayType'}
        />
      </div>
    </div>
  );
}

export default App;

