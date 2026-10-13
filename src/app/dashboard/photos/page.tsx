"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Lock, Eye, Trash2, ArrowLeft, Star, ShieldCheck, UploadCloud } from "lucide-react";
import { api } from "@/lib/api";

export default function PhotosManagerPage() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [isPrivateUpload, setIsPrivateUpload] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPhotos = async () => {
    try {
      const res = await api.profile.getMe();
      if (res.success && res.data) {
        setPhotos(res.data.photos || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoUrl.trim()) return;
    try {
      const res = await api.profile.addPhoto({
        url: newPhotoUrl.trim(),
        isPrivate: isPrivateUpload,
        isPrimary: photos.length === 0,
      });
      if (res.success && res.data) {
        setPhotos(res.data.photos || []);
        setNewPhotoUrl("");
      }
    } catch (err) {
      alert("Failed to upload photo");
    }
  };

  const handleDelete = async (photoId: string) => {
    try {
      const res = await api.profile.deletePhoto(photoId);
      if (res.success && res.data) {
        setPhotos(res.data.photos || []);
      }
    } catch (err) {
      alert("Failed to delete photo");
    }
  };

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
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
          Private Photographs Vault
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          You decide your visibility. Photos marked private remain blurred until an introduction is mutually unlocked.
        </p>
      </div>

      {/* Security Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-950 flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block">Zero Public Indexing Promise</span>
          <span>Your media is hosted in private object storage. No Google image scraping, no public catalogue browsing.</span>
        </div>
      </div>

      {/* Upload Form */}
      <form onSubmit={handleAddPhoto} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
        <h2 className="text-sm font-serif font-bold text-stone-900">Add New Photograph</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            required
            value={newPhotoUrl}
            onChange={(e) => setNewPhotoUrl(e.target.value)}
            placeholder="Image URL (e.g. Cloudflare / S3 / Unsplash)..."
            className="flex-1 text-xs p-3 rounded-xl border border-stone-200"
          />
          <div className="flex items-center space-x-2 px-2">
            <input
              type="checkbox"
              id="privateToggle"
              checked={isPrivateUpload}
              onChange={(e) => setIsPrivateUpload(e.target.checked)}
              className="rounded text-rose-700"
            />
            <label htmlFor="privateToggle" className="text-xs text-stone-700">
              Mark as Private (Blurred)
            </label>
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold shadow-xs"
          >
            Upload
          </button>
        </div>
      </form>

      {/* Photos Grid */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-4">
        <h2 className="text-sm font-serif font-bold text-stone-900">Uploaded Photographs ({photos.length})</h2>

        {photos.length === 0 ? (
          <p className="text-xs text-stone-400 py-6 text-center">No photographs uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div key={photo._id} className="relative rounded-2xl overflow-hidden aspect-square border border-stone-200 group">
                <img
                  src={photo.url}
                  alt="Profile"
                  className={`w-full h-full object-cover ${photo.isPrivate ? "filter blur-xs" : ""}`}
                />
                <div className="absolute top-2 left-2 flex gap-1">
                  {photo.isPrimary && (
                    <span className="bg-rose-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                      Primary
                    </span>
                  )}
                  {photo.isPrivate && (
                    <span className="bg-stone-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md flex items-center space-x-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Private</span>
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(photo._id)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
