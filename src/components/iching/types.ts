export interface HexagramData {
  number: number;
  binary: string;
  name: string;
  symbol: string;
  judgment: string;
  image: string;
  lines: string[];
}

export interface ChangingLineInterpretation {
  transition: string;
  from_to: string;
  core_message: string;
  practical_advice: string[];
  warning: string;
}

export interface ChangingLine {
  index: number;
  text: string;
  interpretation?: string;
  changing_to?: number;
  changing_hexagram_name?: string;
  changing_interpretation?: ChangingLineInterpretation;
}

export interface IChingResult {
  primaryHexagram: HexagramData;
  changingLines: ChangingLine[];
  resultingHexagram?: HexagramData;
  error?: string;
}
