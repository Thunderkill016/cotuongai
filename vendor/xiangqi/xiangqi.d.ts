export type Side = 'r' | 'b';
export type PieceType = 'k' | 'a' | 'b' | 'n' | 'r' | 'c' | 'p';
export interface Piece { type: PieceType; color: Side }
export interface Move { color: Side; from: string; to: string; piece: PieceType; captured?: PieceType; flags: string; iccs: string }
export class Xiangqi {
  constructor(fen?: string);
  load(fen: string): boolean;
  fen(): string;
  turn(): Side;
  board(): (Piece | null)[][];
  get(square: string): Piece | null;
  moves(options: { verbose: true; square?: string; opponent?: boolean }): Move[];
  moves(options?: { square?: string }): string[];
  move(move: string | { from: string; to: string }): Move | null;
  undo(): Move | null;
  in_check(): boolean;
  in_checkmate(): boolean;
  in_stalemate(): boolean;
  in_draw(): boolean;
  insufficient_material(): boolean;
  in_threefold_repetition(): boolean;
  game_over(): boolean;
  validate_fen(fen: string): { valid: boolean; error: string };
}
