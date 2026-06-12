"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ---------------------------------------------------------
// Helper: Format large numbers
// ---------------------------------------------------------
const formatNumber = (num: number) => {
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(0)}k`;
  }
  return num.toString();
};

// ---------------------------------------------------------
// 1. InteractiveAreaChart (Single Line/Area Chart)
// ---------------------------------------------------------
interface AreaChartProps {
  data: { label: string; value: number }[];
  height?: number;
  gradientColors?: [string, string];
  lineColor?: string;
  valueSuffix?: string;
  valuePrefix?: string;
}

export function InteractiveAreaChart({
  data,
  height = 200,
  gradientColors = ["#266df0", "#4f46e5"],
  lineColor = "#266df0",
  valueSuffix = "",
  valuePrefix = "",
}: AreaChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState(500);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width || 500);
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  if (!data || data.length === 0) return null;

  const paddingX = 40;
  const paddingY = 30;
  const chartWidth = containerWidth - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const values = data.map((d) => d.value);
  const maxVal = Math.max(...values, 1);
  const minVal = 0; // standard baseline

  // Calculate points
  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * chartWidth;
    const y = paddingY + chartHeight - (d.value / maxVal) * chartHeight;
    return { x, y, ...d };
  });

  // SVG Line path
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // SVG Area path (closes at the bottom)
  const areaPath = `
    ${linePath}
    L ${points[points.length - 1].x} ${height - paddingY}
    L ${points[0].x} ${height - paddingY}
    Z
  `;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find closest point by X coordinate
    const index = Math.min(
      data.length - 1,
      Math.max(0, Math.round(((x - paddingX) / chartWidth) * (data.length - 1)))
    );

    setActiveIndex(index);
    setCoords({ x: points[index].x, y: points[index].y });
  };

  const handleMouseLeave = () => {
    setActiveIndex(null);
    setCoords(null);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        width="100%"
        height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="overflow-visible cursor-crosshair"
      >
        <defs>
          <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradientColors[0]} stopOpacity={0.25} />
            <stop offset="100%" stopColor={gradientColors[1]} stopOpacity={0.0} />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = paddingY + chartHeight * ratio;
          const gridVal = Math.round(maxVal * (1 - ratio));
          return (
            <g key={ratio} className="opacity-40">
              <line
                x1={paddingX}
                y1={y}
                x2={containerWidth - paddingX}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <text
                x={paddingX - 8}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] font-medium fill-slate-400"
              >
                {valuePrefix}{formatNumber(gridVal)}{valueSuffix}
              </text>
            </g>
          );
        })}

        {/* Area fill path */}
        <motion.path
          d={areaPath}
          fill="url(#area-gradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        />

        {/* Line stroke path */}
        <motion.path
          d={linePath}
          fill="none"
          stroke={lineColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />

        {/* X Axis labels */}
        {points.map((p, i) => {
          // Only show labels for first, middle, last, or every alternate to prevent overlap
          const shouldShow = data.length <= 7 || i % 2 === 0 || i === data.length - 1;
          if (!shouldShow) return null;
          return (
            <text
              key={i}
              x={p.x}
              y={height - 8}
              textAnchor="middle"
              className="text-[10px] font-medium fill-slate-400"
            >
              {p.label}
            </text>
          );
        })}

        {/* Interactive Vertical Guide Line */}
        {activeIndex !== null && coords && (
          <line
            x1={coords.x}
            y1={paddingY}
            x2={coords.x}
            y2={height - paddingY}
            stroke={lineColor}
            strokeWidth={1.5}
            strokeDasharray="3 3"
            className="opacity-70"
          />
        )}

        {/* Interactive Highlight Nodes */}
        {points.map((p, i) => {
          const isActive = activeIndex === i;
          return (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={isActive ? 6 : 3.5}
                fill={isActive ? lineColor : "#ffffff"}
                stroke={lineColor}
                strokeWidth={2}
                className="transition-all duration-150"
              />
              {isActive && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={12}
                  fill={lineColor}
                  className="opacity-20 animate-ping pointer-events-none"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Glassmorphic floating tooltip */}
      <AnimatePresence>
        {activeIndex !== null && coords && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-10 rounded-lg border border-slate-200/80 bg-white/95 p-2.5 shadow-lg backdrop-blur-md text-xs pointer-events-none"
            style={{
              left: `${Math.min(containerWidth - 140, Math.max(10, coords.x - 65))}px`,
              top: `${Math.max(0, coords.y - 70)}px`,
            }}
          >
            <p className="font-semibold text-slate-800">{data[activeIndex].label}</p>
            <p className="text-accent font-bold mt-0.5 text-sm">
              {valuePrefix}
              {data[activeIndex].value.toLocaleString()}
              {valueSuffix}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------
// 2. InteractiveBarChart (Single or Comparative Bar Chart)
// ---------------------------------------------------------
interface BarChartProps {
  data: { label: string; value: number; secondary?: number }[];
  height?: number;
  primaryColor?: string;
  secondaryColor?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
}

export function InteractiveBarChart({
  data,
  height = 220,
  primaryColor = "#266df0",
  secondaryColor = "#a5b4fc", // lighter indigo
  primaryLabel = "Value 1",
  secondaryLabel = "Value 2",
}: BarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(500);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width || 500);
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  if (!data || data.length === 0) return null;

  const hasSecondary = data.some((d) => d.secondary !== undefined);
  const paddingX = 40;
  const paddingY = 30;
  const chartWidth = containerWidth - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Max value calculation
  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.value, d.secondary || 0)),
    1
  );

  const barGroupWidth = chartWidth / data.length;
  const gap = 8;
  const barWidth = hasSecondary
    ? (barGroupWidth - gap * 3) / 2
    : barGroupWidth - gap * 2;

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        width="100%"
        height={height}
        className="overflow-visible"
        onMouseLeave={() => setActiveIndex(null)}
      >
        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = paddingY + chartHeight * ratio;
          const gridVal = Math.round(maxVal * (1 - ratio));
          return (
            <g key={ratio} className="opacity-40">
              <line
                x1={paddingX}
                y1={y}
                x2={containerWidth - paddingX}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth={1}
              />
              <text
                x={paddingX - 8}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] font-medium fill-slate-400"
              >
                {gridVal}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const groupX = paddingX + i * barGroupWidth;
          const isActive = activeIndex === i;

          // Primary Bar
          const primaryHeight = (d.value / maxVal) * chartHeight;
          const primaryX = hasSecondary
            ? groupX + gap
            : groupX + gap;
          const primaryY = paddingY + chartHeight - primaryHeight;

          // Secondary Bar
          const secondaryHeight = d.secondary ? (d.secondary / maxVal) * chartHeight : 0;
          const secondaryX = primaryX + barWidth + gap / 2;
          const secondaryY = paddingY + chartHeight - secondaryHeight;

          return (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setActiveIndex(i)}
            >
              {/* Interaction transparent backdrop overlay */}
              <rect
                x={groupX}
                y={paddingY}
                width={barGroupWidth}
                height={chartHeight}
                fill="transparent"
              />

              {/* Primary Bar */}
              <motion.rect
                x={primaryX}
                y={primaryY}
                width={Math.max(barWidth, 2)}
                height={Math.max(primaryHeight, 2)}
                rx={3}
                fill={primaryColor}
                opacity={activeIndex === null || isActive ? 1 : 0.6}
                initial={{ scaleY: 0, originY: 1 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.5, delay: i * 0.05, ease: "easeOut" }}
              />

              {/* Secondary Bar */}
              {hasSecondary && d.secondary !== undefined && (
                <motion.rect
                  x={secondaryX}
                  y={secondaryY}
                  width={Math.max(barWidth, 2)}
                  height={Math.max(secondaryHeight, 2)}
                  rx={3}
                  fill={secondaryColor}
                  opacity={activeIndex === null || isActive ? 1 : 0.6}
                  initial={{ scaleY: 0, originY: 1 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.5, delay: i * 0.05 + 0.02, ease: "easeOut" }}
                />
              )}

              {/* X Axis Label */}
              <text
                x={groupX + barGroupWidth / 2}
                y={height - 8}
                textAnchor="middle"
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? "fill-slate-800 font-semibold" : "fill-slate-400"
                }`}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {activeIndex !== null && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute z-10 -top-14 rounded-lg border border-slate-200/80 bg-white/95 p-2.5 shadow-lg backdrop-blur-md text-xs pointer-events-none flex flex-col gap-0.5"
            style={{
              left: `${Math.min(
                containerWidth - 150,
                Math.max(10, paddingX + activeIndex * barGroupWidth + barGroupWidth / 2 - 60)
              )}px`,
            }}
          >
            <p className="font-semibold text-slate-800 text-center border-b border-slate-100 pb-1 mb-1">
              {data[activeIndex].label}
            </p>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                {hasSecondary ? primaryLabel : "Value"}:
              </span>
              <span className="font-bold text-slate-800 ml-auto">
                {data[activeIndex].value}
              </span>
            </div>
            {hasSecondary && data[activeIndex].secondary !== undefined && (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: secondaryColor }} />
                  {secondaryLabel}:
                </span>
                <span className="font-bold text-slate-800 ml-auto">
                  {data[activeIndex].secondary}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------
// 3. InteractiveRadialChart (Donut Segment Chart)
// ---------------------------------------------------------
interface RadialChartProps {
  data: { label: string; value: number; color: string }[];
  centerLabel?: string;
  centerValue?: string;
}

export function InteractiveRadialChart({
  data,
  centerLabel = "Total",
  centerValue,
}: RadialChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const valueForDisplay = centerValue !== undefined ? centerValue : total.toString();

  // Circle properties
  const radius = 38;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius; // ~238.76

  // Calculate coordinates & stroke details for segments
  let accumulatedPercent = 0;
  const segments = data.map((d, i) => {
    const percentage = d.value / total;
    const strokeDashoffset = circumference - percentage * circumference;
    const rotation = (accumulatedPercent * 360) - 90; // Start at top
    accumulatedPercent += percentage;

    return {
      ...d,
      strokeDashoffset,
      rotation,
      percentage: Math.round(percentage * 100),
    };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-3">
      {/* SVG Donut Circle */}
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full transform -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {segments.map((seg, i) => {
            const isHovered = hoveredIndex === i;
            return (
              <motion.circle
                key={i}
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeLinecap="round"
                style={{
                  transformOrigin: "50px 50px",
                  rotate: `${seg.rotation}deg`,
                  cursor: "pointer",
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: seg.strokeDashoffset }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
              />
            );
          })}
        </svg>

        {/* Center Text Panel */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-xs text-muted font-medium uppercase tracking-wider scale-90">
            {hoveredIndex !== null ? segments[hoveredIndex].label : centerLabel}
          </span>
          <span className="text-xl font-bold text-foreground mt-0.5 leading-none transition-all">
            {hoveredIndex !== null ? `${segments[hoveredIndex].percentage}%` : valueForDisplay}
          </span>
        </div>
      </div>

      {/* Legend layout */}
      <div className="flex flex-col gap-2.5 min-w-[120px]">
        {segments.map((seg, i) => {
          const isHovered = hoveredIndex === i;
          return (
            <div
              key={i}
              className={`flex items-center gap-2 px-2 py-1 rounded-md transition-colors cursor-pointer ${
                isHovered ? "bg-slate-50" : ""
              }`}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-700 leading-tight">
                  {seg.label}
                </span>
                <span className="text-[10px] text-muted font-medium">
                  {seg.value} candidates ({seg.percentage}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
