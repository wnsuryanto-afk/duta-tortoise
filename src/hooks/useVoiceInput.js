/**
 * useVoiceInput — Web Speech API (SpeechRecognition) hook for Bahasa Indonesia.
 * Returns support flag, listening state, toggle function, and interim transcript.
 * Browsers without SpeechRecognition (e.g. older iOS Safari) → supported=false.
 */
import { useState, useRef, useEffect, useCallback } from "react";

export function useVoiceInput({ lang = "id-ID", onResult } = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef(null);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (interimText) setInterim(interimText);
      if (finalText) {
        setInterim("");
        onResultRef.current?.(finalText.trim());
      }
    };

    rec.onerror = (e) => {
      setListening(false);
      setInterim("");
      // "not-allowed" / "service-not-allowed" → user denied or no mic
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        onResultRef.current?.("__MIC_DENIED__");
      }
    };

    rec.onend = () => {
      setListening(false);
      setInterim("");
    };

    recRef.current = rec;
    return () => {
      try { rec.abort(); } catch (_) {}
      recRef.current = null;
    };
  }, [lang]);

  const toggle = useCallback(() => {
    if (!recRef.current) return;
    if (listening) {
      try { recRef.current.stop(); } catch (_) {}
      setListening(false);
      return;
    }
    setInterim("");
    try {
      recRef.current.start();
      setListening(true);
    } catch (e) {
      // start() throws if called too quickly after a previous session
      setListening(false);
    }
  }, [listening]);

  return { supported, listening, interim, toggle };
}