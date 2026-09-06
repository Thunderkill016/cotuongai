import { useRef, useState } from "react";
import { FILES, GLYPHS, pieceName, position, squareAt } from "./chess";

interface Props {
  fen: string;
  selected: string | null;
  destinations: string[];
  arrow?: string | null;
  lastMove?: string | null;
  onSquare: (sq: string) => void;
  disabled?: boolean;
  flipped: boolean;
  tutorialSquares?: string[];
}
export function Board({
  fen,
  selected,
  destinations,
  arrow,
  lastMove,
  onSquare,
  disabled,
  flipped,
  tutorialSquares = [],
}: Props) {
  const game = position(fen);
  const [focus, setFocus] = useState(85); // Red general at e0 is a useful keyboard starting point.
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const coords = (sq: string) => {
    const c = FILES.indexOf(sq[0]);
    const r = 9 - Number(sq[1]);
    return [54 + (flipped ? 8 - c : c) * 54, 54 + (flipped ? 9 - r : r) * 54];
  };
  const arrowPoints =
    arrow && /^[a-i][0-9][a-i][0-9]$/.test(arrow)
      ? [coords(arrow.slice(0, 2)), coords(arrow.slice(2))]
      : null;
  return (
    <div className="board-frame">
      <div
        className="board"
        role="grid"
        aria-label="Bàn cờ tướng. Dùng phím mũi tên để di chuyển, Enter để chọn quân và điểm đến."
        aria-rowcount={10}
        aria-colcount={9}
      >
        <svg className="board-lines" viewBox="0 0 540 600" aria-hidden="true">
          <defs>
            <marker
              id="arrow-head"
              markerWidth="6"
              markerHeight="6"
              refX="4"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L6,3 L0,6Z" fill="#bb642e" />
            </marker>
          </defs>
          <rect
            x="46"
            y="46"
            width="448"
            height="502"
            rx="1"
            fill="none"
            strokeWidth="2"
          />
          {Array.from({ length: 10 }, (_, r) => (
            <path key={`h${r}`} d={`M54 ${54 + r * 54} H486`} />
          ))}
          {Array.from({ length: 9 }, (_, c) => (
            <g key={`v${c}`}>
              <path d={`M${54 + c * 54} 54 V270`} />
              <path d={`M${54 + c * 54} 324 V540`} />
            </g>
          ))}
          <path d="M54 270V324 M486 270V324 M216 54L324 162 M324 54L216 162 M216 432L324 540 M324 432L216 540" />
          <text x="172" y="305" className="river">
            SÔNG SỞ
          </text>
          <text x="366" y="305" className="river">
            BỜ HÁN
          </text>
          {FILES.split("").map((_, c) => (
            <text key={c} x={54 + c * 54} y="579" className="coordinate">
              {FILES[flipped ? 8 - c : c]}
            </text>
          ))}
          {Array.from({ length: 10 }, (_, r) => (
            <text key={r} x="22" y={59 + r * 54} className="coordinate">
              {flipped ? r : 9 - r}
            </text>
          ))}
          {[
            ...["b2", "h2", "b7", "h7"],
            ...["a3", "c3", "e3", "g3", "i3", "a6", "c6", "e6", "g6", "i6"],
          ].map((sq) => {
            const [x, y] = coords(sq);
            return (
              <g key={sq} className="board-marks">
                <path
                  d={`M${x - 9} ${y - 15}v6h-6 M${x + 9} ${y - 15}v6h6 M${x - 9} ${y + 15}v-6h-6 M${x + 9} ${y + 15}v-6h6`}
                />
              </g>
            );
          })}
        </svg>
        {Array.from({ length: 90 }, (_, i) => {
          const row = Math.floor(i / 9),
            col = i % 9;
          const sq = squareAt(flipped ? 9 - row : row, flipped ? 8 - col : col);
          const piece = game.get(sq);
          const destination = destinations.includes(sq);
          const recent =
            lastMove?.slice(0, 2) === sq || lastMove?.slice(2) === sq;
          return (
            <button
              key={sq}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="gridcell"
              aria-rowindex={row + 1}
              aria-colindex={col + 1}
              className={`square ${selected === sq ? "selected" : ""} ${destination ? "destination" : ""} ${recent ? "recent" : ""} ${tutorialSquares.includes(sq) ? "tutorial-focus" : ""}`}
              style={{ left: `${10 + col * 10}%`, top: `${9 + row * 9}%` }}
              aria-label={`${sq}${piece ? `, ${pieceName(piece)}` : ", trống"}${destination ? ", có thể đi" : ""}`}
              aria-selected={selected === sq}
              aria-disabled={disabled || undefined}
              tabIndex={focus === i ? 0 : -1}
              onFocus={() => setFocus(i)}
              onClick={() => {
                if (!disabled) onSquare(sq);
              }}
              onKeyDown={(event) => {
                const shifts: Record<string, number> = {
                  ArrowUp: -9,
                  ArrowDown: 9,
                  ArrowLeft: -1,
                  ArrowRight: 1,
                };
                if (event.key in shifts) {
                  event.preventDefault();
                  const next = Math.max(0, Math.min(89, i + shifts[event.key]));
                  setFocus(next);
                  refs.current[next]?.focus();
                }
              }}
            >
              {piece ? (
                <span
                  className={`piece ${piece.color === "r" ? "red" : "black"}`}
                >
                  <span className="piece-glyph">
                    {GLYPHS[piece.color + piece.type]}
                  </span>
                </span>
              ) : destination ? (
                <span className="move-dot" />
              ) : null}
            </button>
          );
        })}
        {arrowPoints && (
          <svg
            className="board-arrows"
            viewBox="0 0 540 600"
            aria-hidden="true"
          >
            <path
              d={`M${arrowPoints[0].join(" ")} L${arrowPoints[1].join(" ")}`}
              stroke="#bb642e"
              strokeWidth="7"
              opacity=".8"
              markerEnd="url(#arrow-head)"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
