"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Mic,
  MicOff,
  Save,
  Compass,
  Award,
} from "lucide-react";
import { api } from "@/lib/api";

export default function AssessmentPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, { option: string; score: number }>>({});
  const [dimensionScores, setDimensionScores] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  useEffect(() => {
    Promise.all([api.assessment.getQuestions(), api.assessment.getMe()]).then(
      ([qRes, aRes]) => {
        if (qRes.success && qRes.data) {
          setQuestions(qRes.data);
        }
        if (aRes.success && aRes.data) {
          const prev = aRes.data;
          setDimensionScores(prev.dimensionScores);
          const initialAns: Record<string, { option: string; score: number }> = {};
          prev.answers?.forEach((ans: any) => {
            initialAns[ans.questionId] = {
              option: ans.selectedOption,
              score: ans.numericScore,
            };
          });
          setAnswers(initialAns);
        }
        setLoading(false);
      }
    );
  }, []);

  const handleSelectOption = (q: any, opt: any) => {
    setAnswers((prev) => ({
      ...prev,
      [q.id]: {
        option: opt.text,
        score: opt.score,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formattedAnswers = questions
        .filter((q) => answers[q.id])
        .map((q) => ({
          questionId: q.id,
          dimension: q.dimension,
          questionText: q.questionText,
          selectedOption: answers[q.id].option,
          numericScore: answers[q.id].score,
        }));

      const res = await api.assessment.submit(formattedAnswers);
      if (res.success && res.data) {
        setDimensionScores(res.data.dimensionScores);
        setSuccessMessage(true);
        setTimeout(() => setSuccessMessage(false), 3000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const [voiceReflectionText, setVoiceReflectionText] = useState("");
  const recognitionRef = useRef<any>(null);

  // Browser-native speech recognition for voice typing
  const toggleVoiceTyping = () => {
    if (typeof window === "undefined") return;

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please type directly in the box below.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      let currentTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript + " ";
      }
      setVoiceReflectionText(currentTranscript.trim());
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-rose-700 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="text-xs font-semibold text-rose-700 hover:underline flex items-center space-x-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
              Relationship Values & Compatibility Assessment
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Structured questionnaire across 6 pillars: Values, Communication, Finances, Family, Lifestyle, and Career.
            </p>
          </div>

          {/* Voice Typing Button (Feature S-06) */}
          <button
            type="button"
            onClick={toggleVoiceTyping}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center space-x-1.5 transition-colors ${
              isListening
                ? "bg-rose-100 text-rose-900 border-rose-300 animate-pulse"
                : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
            }`}
          >
            {isListening ? <Mic className="w-3.5 h-3.5 text-rose-600" /> : <MicOff className="w-3.5 h-3.5 text-stone-400" />}
            <span>{isListening ? "Listening..." : "Voice Input (Speech-to-Text)"}</span>
          </button>
        </div>
      </div>

      {/* Alignment Radar / Dimension Scores */}
      {dimensionScores && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-rose-700 text-xs font-bold uppercase tracking-wider">
            <Award className="w-4 h-4" />
            <span>Your Calibrated Value Alignment Profile</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs pt-2">
            {Object.entries(dimensionScores).map(([dim, score]: [string, any]) => (
              <div key={dim} className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-1">
                <span className="text-stone-500 uppercase text-[10px] font-bold block">{dim}</span>
                <span className="text-lg font-serif font-bold text-stone-900">{score}% Score</span>
                <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="bg-rose-700 h-full rounded-full" style={{ width: `${score}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-xs flex items-center space-x-2 border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Compatibility answers recorded and calibrated into your matchmaking vector.</span>
        </div>
      )}

      {/* Questionnaire Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {questions.map((q, idx) => {
          const selected = answers[q.id]?.option;
          return (
            <div key={q.id} className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-rose-50 text-rose-700 text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                  {q.dimension}
                </span>
              </div>

              <h3 className="font-serif font-bold text-base text-stone-900 leading-snug">
                {q.questionText}
              </h3>

              <div className="space-y-2 pt-1">
                {q.options.map((opt: any, optIdx: number) => {
                  const isChosen = selected === opt.text;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(q, opt)}
                      className={`w-full text-left p-3.5 rounded-2xl border text-xs sm:text-sm transition-all flex items-center justify-between ${
                        isChosen
                          ? "bg-rose-50/70 border-rose-600 text-rose-950 font-semibold shadow-xs"
                          : "border-stone-200 text-stone-700 hover:bg-stone-50"
                      }`}
                    >
                      <span>{opt.text}</span>
                      {isChosen && <CheckCircle2 className="w-4 h-4 text-rose-700 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Voice Typing Reflection Card */}
        <div className="bg-white rounded-3xl border border-rose-200/80 p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-md uppercase tracking-wider">
                Voice Reflection & Philosophy
              </span>
              <h3 className="font-serif font-bold text-base text-stone-900 mt-1">
                Share your relationship expectations in your own words
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Click the microphone to speak naturally. Your speech is transcribed in real-time with zero audio retained.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleVoiceTyping}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition shrink-0 shadow-sm ${
                isListening
                  ? "bg-rose-700 text-white animate-pulse"
                  : "bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200"
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4" /> Stop Recording
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-rose-700" /> Start Voice Typing
                </>
              )}
            </button>
          </div>

          <textarea
            rows={4}
            value={voiceReflectionText}
            onChange={(e) => setVoiceReflectionText(e.target.value)}
            placeholder="Describe what a healthy partnership means to you, your communication style, or values that matter most..."
            className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-rose-800 focus:border-transparent text-stone-800 bg-stone-50/50"
          />
          {isListening && (
            <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-600"></span> Listening to your voice... Speak clearly into your microphone.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 rounded-2xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-rose-800 to-rose-700 hover:from-rose-900 hover:to-rose-800 shadow-lg shadow-rose-900/20 transition-all flex items-center justify-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>{submitting ? "Saving Assessment..." : "Save Assessment & Calibrate Matching"}</span>
        </button>
      </form>
    </div>
  );
}
