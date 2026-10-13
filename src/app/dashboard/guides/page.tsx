"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  BookOpen,
  Headphones,
  Play,
  Pause,
  CheckCircle,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Volume2,
  ArrowLeft,
  BookmarkCheck,
} from "lucide-react";
import { api } from "@/lib/api";

export default function GuidesPage() {
  const [guides, setGuides] = useState<any[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showTranscript, setShowTranscript] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadGuides();
  }, []);

  const loadGuides = async () => {
    setLoading(true);
    try {
      const res = await api.guides.getAll();
      if (res.success && res.data) {
        setGuides(res.data);
        if (res.data.length > 0 && !selectedGuide) {
          setSelectedGuide(res.data[0]);
          setCurrentTime(res.data[0].playbackPositionSeconds || 0);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Simulated audio playback tracker
  useEffect(() => {
    if (isPlaying) {
      audioIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 1 * playbackSpeed;
          const max = selectedGuide?.durationSeconds || 300;
          if (next >= max) {
            setIsPlaying(false);
            handleMarkCompleted(selectedGuide?._id, max);
            return max;
          }
          return next;
        });
      }, 1000);
    } else {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    }
    return () => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, [isPlaying, playbackSpeed, selectedGuide]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
  };

  const handleSelectGuide = (guide: any) => {
    if (isPlaying) setIsPlaying(false);
    setSelectedGuide(guide);
    setCurrentTime(guide.playbackPositionSeconds || 0);
  };

  const handleMarkCompleted = async (guideId: string, position: number) => {
    try {
      await api.guides.saveProgress(guideId, position, true);
      setGuides((prev) =>
        prev.map((g) => (g._id === guideId ? { ...g, isCompleted: true } : g))
      );
    } catch (e) {
      console.warn("Failed to save progress", e);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const filteredGuides =
    activeCategory === "ALL"
      ? guides
      : guides.filter((g) => g.category === activeCategory);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-rose-700 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm font-medium text-stone-500 hover:text-stone-800 mb-4 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-stone-900 tracking-tight flex items-center gap-3">
              <BookOpen className="w-7 h-7 text-rose-700" /> Relationship E-Guides & Audio
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              Curated masterclasses and audio essays on values, family boundaries, and healthy communication before marriage.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-50 text-amber-800 text-xs font-semibold rounded-full border border-amber-200 flex items-center gap-1.5">
              <BookmarkCheck className="w-3.5 h-3.5 text-amber-600" /> Marriage Readiness Curriculum
            </span>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
        {[
          { id: "ALL", label: "All Masterclasses" },
          { id: "VALUES_ALIGNMENT", label: "Values & Philosophy" },
          { id: "FINANCIAL_HEALTH", label: "Financial Transparency" },
          { id: "FAMILY_COMMUNICATION", label: "Family Dynamics" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id)}
            className={`px-4 py-2 rounded-full text-xs font-medium transition ${
              activeCategory === tab.id
                ? "bg-rose-900 text-white shadow-sm"
                : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Grid: Guide Player + Guides Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Active Guide Reader & Audio Player */}
        <div className="lg:col-span-2 space-y-6">
          {selectedGuide ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md">
                  {selectedGuide.category.replace(/_/g, " ")}
                </span>
                <h2 className="text-2xl font-serif font-bold text-stone-900 mt-2">
                  {selectedGuide.title}
                </h2>
                <p className="text-sm text-stone-500 mt-1 italic">
                  {selectedGuide.summary}
                </p>
              </div>

              {/* Audio Player Widget */}
              <div className="bg-[#fdf8f6] border border-rose-200/60 rounded-xl p-5 space-y-4 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-700 text-white flex items-center justify-center shadow-md">
                      <Headphones className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                        Audio Masterclass
                      </p>
                      <p className="text-xs text-stone-500">
                        Duration: {formatTime(selectedGuide.durationSeconds || 300)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[1, 1.25, 1.5].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => setPlaybackSpeed(spd)}
                        className={`text-xs px-2 py-0.5 rounded font-mono ${
                          playbackSpeed === spd
                            ? "bg-rose-900 text-white font-bold"
                            : "bg-white text-stone-600 border border-stone-200"
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Progress Slider */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min={0}
                    max={selectedGuide.durationSeconds || 300}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-rose-200 rounded-lg appearance-none cursor-pointer accent-rose-700"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-stone-500">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(selectedGuide.durationSeconds || 300)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={togglePlayPause}
                    className="flex items-center gap-2 px-5 py-2.5 bg-rose-900 hover:bg-rose-800 text-white rounded-full text-xs font-semibold shadow transition"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-4 h-4 fill-current" /> Pause Audio
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" /> Play Audio Lesson
                      </>
                    )}
                  </button>

                  <button
                    onClick={() =>
                      handleMarkCompleted(
                        selectedGuide._id,
                        selectedGuide.durationSeconds || 300
                      )
                    }
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition ${
                      selectedGuide.isCompleted
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    {selectedGuide.isCompleted ? "Completed" : "Mark as Completed"}
                  </button>
                </div>
              </div>

              {/* Written Curriculum Article */}
              <div className="prose prose-stone max-w-none text-stone-800 text-sm leading-relaxed space-y-4 pt-2 border-t border-stone-100">
                <div
                  dangerouslySetInnerHTML={{
                    __html: selectedGuide.bodyMarkdown.replace(
                      /\n/g,
                      "<br/>"
                    ),
                  }}
                />
              </div>

              {/* Accessible Transcript Toggle */}
              {selectedGuide.transcriptText && (
                <div className="border border-stone-200 rounded-xl overflow-hidden bg-stone-50/60">
                  <button
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
                  >
                    <span className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-stone-500" /> Full Accessible Audio Transcript
                    </span>
                    {showTranscript ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  {showTranscript && (
                    <div className="p-4 bg-white text-xs text-stone-600 leading-relaxed border-t border-stone-200">
                      {selectedGuide.transcriptText}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-500">
              Select a guide from the curriculum list to begin.
            </div>
          )}
        </div>

        {/* Right Column: Curriculum Playlist */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-stone-600 px-1">
            Curriculum Modules ({filteredGuides.length})
          </h3>
          <div className="space-y-3">
            {filteredGuides.map((guide, idx) => {
              const isCurrent = selectedGuide?._id === guide._id;
              return (
                <div
                  key={guide._id}
                  onClick={() => handleSelectGuide(guide)}
                  className={`p-4 rounded-xl border transition cursor-pointer flex items-start gap-3.5 ${
                    isCurrent
                      ? "bg-rose-50/80 border-rose-300 shadow-sm"
                      : "bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50/60"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      isCurrent
                        ? "bg-rose-900 text-white"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-stone-900 truncate">
                      {guide.title}
                    </p>
                    <p className="text-[11px] text-stone-500 line-clamp-2 mt-0.5">
                      {guide.summary}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-stone-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />{" "}
                        {Math.ceil((guide.durationSeconds || 300) / 60)} mins
                      </span>
                      {guide.isCompleted && (
                        <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                          <CheckCircle className="w-3 h-3" /> Done
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
