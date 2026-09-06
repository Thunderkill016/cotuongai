import { useState } from "react";
import { Cuboid, Grid3X3 } from "lucide-react";
import { Battlefield3DEnhanced } from "./Battlefield3DEnhanced";
import { Board2D, type BoardViewProps } from "./Board2D";
import "./battlefield3d.css";

export function Board(props: BoardViewProps) {
  const [view, setView] = useState<"3d" | "2d">("3d");

  return (
    <div className="board-view-shell">
      <div className="board-view-switch" aria-label="Kiểu bàn cờ">
        <button
          type="button"
          className={view === "3d" ? "active" : ""}
          aria-pressed={view === "3d"}
          onClick={() => setView("3d")}
        >
          <Cuboid size={16} />
          Sa bàn 3D
        </button>
        <button
          type="button"
          className={view === "2d" ? "active" : ""}
          aria-pressed={view === "2d"}
          onClick={() => setView("2d")}
        >
          <Grid3X3 size={16} />
          Bàn 2D
        </button>
      </div>
      {view === "3d" ? <Battlefield3DEnhanced {...props} /> : <Board2D {...props} />}
    </div>
  );
}
