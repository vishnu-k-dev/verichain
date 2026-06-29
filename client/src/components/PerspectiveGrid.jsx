import React, { useEffect, useState, useMemo } from "react";
import { cn } from "../lib.js";

/**
 * A 3D perspective grid of bordered tiles with a radial fade — used as a subtle
 * decorative backdrop. Adapted from a TSX component to plain JSX; the base
 * surface is transparent and the fade blends to the app's paper colour.
 *
 * @param {object} props
 * @param {string} [props.className]
 * @param {number} [props.gridSize=40]    Tiles per row/column.
 * @param {boolean}[props.showOverlay=true]
 * @param {number} [props.fadeRadius=80]   Radial fade stop (%).
 * @param {string} [props.fadeStop="#FAF9F6"] Colour the grid fades into.
 */
export function PerspectiveGrid({
  className,
  gridSize = 40,
  showOverlay = true,
  fadeRadius = 80,
  fadeStop = "#FAF9F6",
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const tiles = useMemo(() => Array.from({ length: gridSize * gridSize }), [gridSize]);

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden bg-transparent", className)}
      style={{ perspective: "2000px", transformStyle: "preserve-3d", "--fade-stop": fadeStop }}
    >
      <div
        className="absolute grid aspect-square w-[80rem] origin-center"
        style={{
          left: "50%",
          top: "50%",
          transform:
            "translate(-50%, -50%) rotateX(30deg) rotateY(-5deg) rotateZ(20deg) scale(2)",
          transformStyle: "preserve-3d",
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`,
        }}
      >
        {mounted &&
          tiles.map((_, i) => (
            <div
              key={i}
              className="tile min-h-[1px] min-w-[1px] border border-line bg-transparent transition-colors duration-[1500ms] hover:duration-0"
            />
          ))}
      </div>

      {showOverlay && (
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background: `radial-gradient(circle, transparent 25%, var(--fade-stop) ${fadeRadius}%)`,
          }}
        />
      )}
    </div>
  );
}

export default PerspectiveGrid;
