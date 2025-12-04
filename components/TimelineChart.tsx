import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Issue, Communication } from '../types';

interface TimelineProps {
  issues: Issue[];
  communications: Communication[];
}

const TimelineChart: React.FC<TimelineProps> = ({ issues, communications }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Determine dimensions based on data
    const rowHeight = 60;
    const minHeight = 300;
    const contentHeight = issues.length * rowHeight;
    const totalHeight = Math.max(minHeight, contentHeight);
    
    const margin = { top: 30, right: 30, bottom: 40, left: 180 };
    
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    // Set explicit height on the SVG so the parent container expands
    svg.attr("height", totalHeight + margin.top + margin.bottom);

    // If no data, just show a placeholder or empty grid
    if (issues.length === 0 && communications.length === 0) {
        svg.append("text")
           .attr("x", (svgRef.current.clientWidth || 800) / 2)
           .attr("y", totalHeight / 2)
           .attr("text-anchor", "middle")
           .attr("fill", "#94a3b8")
           .text("No timeline data yet");
        return;
    }

    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = totalHeight;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Parse dates
    const parseDate = (d: string) => new Date(d);
    
    // Get time extent
    const issueDates = issues.map(d => parseDate(d.first_noticed_at));
    const commDates = communications.map(d => parseDate(d.date));
    const allDates = [...issueDates, ...commDates, new Date()]; // Include today
    
    const x = d3.scaleTime()
      .domain(d3.extent(allDates) as [Date, Date])
      .range([0, width])
      .nice();

    const y = d3.scaleBand()
      .domain(issues.map(d => d.title))
      .range([0, height])
      .padding(0.4);

    // X Axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5))
      .attr("class", "text-slate-500 text-xs")
      .style("color-scheme", "light"); // Force light mode for axis

    // Y Axis
    g.append("g")
      .call(d3.axisLeft(y).tickSize(0))
      .attr("class", "text-slate-700 font-medium text-sm")
      .style("color-scheme", "light")
      .selectAll(".tick text")
      .attr("x", -10)
      .style("text-anchor", "end")
      .call((text) => text.each(function(d: any) {
         // Truncate long labels
         const self = d3.select(this);
         const str = self.text();
         if (str.length > 25) {
            self.text(str.substring(0, 22) + "...");
         }
      }));

    // Draw issue bars (ongoing vs resolved)
    g.selectAll(".bar")
      .data(issues)
      .enter()
      .append("rect")
      .attr("x", d => x(parseDate(d.first_noticed_at)))
      .attr("y", d => y(d.title) || 0)
      .attr("width", d => {
        const start = parseDate(d.first_noticed_at);
        const end = d.status === 'resolved' ? new Date() : new Date(); 
        const w = x(end) - x(start);
        return Math.max(5, w);
      })
      .attr("height", y.bandwidth())
      .attr("rx", 4)
      .attr("fill", d => {
        switch (d.severity) {
          case 'emergency': return '#ef4444'; // red-500
          case 'high': return '#f97316'; // orange-500
          case 'medium': return '#eab308'; // yellow-500
          default: return '#3b82f6'; // blue-500
        }
      })
      .attr("opacity", 0.7);

    // Add communications as dots
    communications.forEach(comm => {
      // If linked to issues, put a dot on each issue line
      let linked = false;
      comm.linked_issue_ids.forEach(issueId => {
        const issue = issues.find(i => i.id === issueId);
        if (issue) {
            linked = true;
            g.append("circle")
            .attr("cx", x(parseDate(comm.date)))
            .attr("cy", (y(issue.title) || 0) + y.bandwidth() / 2)
            .attr("r", 6)
            .attr("fill", "#1e293b") // slate-800
            .attr("stroke", "white")
            .attr("stroke-width", 2)
            .append("title")
            .text(`${comm.method}: ${comm.tenant_message.substring(0, 30)}...`);
        }
      });
      
      // If not linked to specific issue, put it on the top line
      if (!linked) {
         g.append("circle")
            .attr("cx", x(parseDate(comm.date)))
            .attr("cy", -15)
            .attr("r", 5)
            .attr("fill", "#64748b")
            .attr("stroke", "white")
            .attr("stroke-width", 1)
            .append("title")
            .text(`General ${comm.method}: ${comm.tenant_message}`);
      }
    });
    
    // Grid lines
    g.append("g")
      .attr("class", "grid-lines")
      .call(d3.axisBottom(x).ticks(5).tickSize(height).tickFormat(() => ""))
      .attr("stroke-dasharray", "2,2")
      .attr("opacity", 0.1);

  }, [issues, communications]);

  return (
    <div className="w-full bg-white p-4 rounded-lg shadow-sm border border-slate-200 mt-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-2">Issue Timeline</h3>
      {/* Removed fixed height so it grows with content */}
      <div className="w-full">
        <svg ref={svgRef} className="w-full overflow-visible block"></svg>
      </div>
    </div>
  );
};

export default TimelineChart;