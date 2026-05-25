"use client";

import React from "react";
import { logger } from "@/lib/logger";
import { CHAT_LIMITS, CHAT_TIMINGS } from "../chat-constants";
import { extractTextFromPDF } from "../pdf-parser";

interface UseFileUploadOptions {
  lang: string;
  setNotice: (notice: string | null) => void;
}

interface UseFileUploadReturn {
  cvText: string;
  cvName: string;
  parsingPdf: boolean;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  clearFile: () => void;
}

export function useFileUpload({ lang, setNotice }: UseFileUploadOptions): UseFileUploadReturn {
  const [cvText, setCvText] = React.useState("");
  const [cvName, setCvName] = React.useState("");
  const [parsingPdf, setParsingPdf] = React.useState(false);
  // Mirror cvName so the upload callback can tell it's replacing an existing
  // attachment without depending on (and being recreated by) cvName.
  const cvNameRef = React.useRef("");
  React.useEffect(() => {
    cvNameRef.current = cvName;
  }, [cvName]);

  const handleFileUpload = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {return;}

    // Reject oversized files before reading them into memory — large PDFs read
    // fully into an ArrayBuffer + parsed in one pass caused "low memory" crashes
    // on mobile. Text uploads only need the first few thousand chars anyway.
    const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_BYTES) {
      setNotice(lang === "ko"
        ? "파일이 너무 커요 (최대 10MB). 더 작은 파일을 올려주세요."
        : "File is too large (max 10MB). Please upload a smaller file.");
      e.target.value = ""; // let the user pick another file immediately
      return;
    }

    // Only one attachment is kept — a new upload replaces the previous one.
    // Make that explicit so the dropped file isn't a silent surprise.
    const replaceHint = cvNameRef.current
      ? (lang === "ko" ? " · 이전 파일 교체됨" : " · replaced previous file")
      : "";

    logger.info("[CV Upload] File:", { name: file.name, type: file.type, size: file.size });
    setCvName(file.name);

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      setParsingPdf(true);
      try {
        const text = await extractTextFromPDF(file);
        logger.info("[CV Upload] PDF parsed, text length:", { length: text.length });
        if (text.length > 0) {
          setCvText(text.slice(0, CHAT_LIMITS.MAX_CV_CHARS));
          setNotice(lang === "ko" ? `이력서 로드 완료 (${text.length}자)${replaceHint}` : `CV loaded (${text.length} chars)${replaceHint}`);
          setTimeout(() => setNotice(null), CHAT_TIMINGS.NOTICE_DISMISS);
        } else {
          setCvText("");
          setNotice(lang === "ko" ? "PDF에서 텍스트를 추출할 수 없습니다" : "Could not extract text from PDF");
        }
      } catch (err: unknown) {
        logger.error("[PDF] parse error:", err);
        setCvText("");
        const error = err as Error;
        if (error?.message === "SCANNED_PDF") {
          setNotice(lang === "ko"
            ? "스캔된 PDF는 텍스트를 읽을 수 없습니다. 텍스트 기반 PDF를 업로드해주세요."
            : "Scanned PDFs cannot be read. Please upload a text-based PDF.");
        } else {
          setNotice(lang === "ko" ? "PDF 파싱 실패" : "PDF parsing failed");
        }
      } finally {
        setParsingPdf(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === "string" ? reader.result : "";
        logger.info("[CV Upload] Text file loaded, length:", { length: text.length });
        setCvText(text.slice(0, CHAT_LIMITS.MAX_CV_CHARS));
        if (text.length > 0) {
          setNotice(lang === "ko" ? `파일 로드 완료 (${text.length}자)${replaceHint}` : `File loaded (${text.length} chars)${replaceHint}`);
          setTimeout(() => setNotice(null), CHAT_TIMINGS.NOTICE_DISMISS);
        }
      };
      reader.onerror = () => {
        logger.error("[FileReader] error:", reader.error);
        setCvText("");
        setCvName("");
        setNotice(lang === "ko" ? "파일 읽기 실패" : "File reading failed");
      };
      reader.readAsText(file);
    }
  }, [lang, setNotice]);

  const clearFile = React.useCallback(() => {
    setCvText("");
    setCvName("");
    setParsingPdf(false);
    setNotice(null);
  }, [setNotice]);

  return { cvText, cvName, parsingPdf, handleFileUpload, clearFile };
}
