export interface HexagramData {
  number: number;
  binary: string;
  name: string;
  symbol: string;
  judgment: string;
  image: string;
  lines: string[];
}

export interface ChangingLine {
  index: number;
  text: string;
}

export interface IChingResult {
  primaryHexagram: HexagramData;
  changingLines: ChangingLine[];
  resultingHexagram?: HexagramData;
  error?: string;
}
