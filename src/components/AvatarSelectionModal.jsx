// src/components/AvatarSelectionModal.jsx
import React, { useState, useEffect, useRef } from "react";
import { X, Upload, Check, Trash2, Image as ImageIcon, Sparkles } from "lucide-react";
import { PRESET_AVATARS, getAvatarUrl } from "../utils/avatars";

// Client-side thumbnail compression (resizes to 160x160 max to prevent large base64 strings)
async function compressImageToThumbnail(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 160;
        let width = img.width;
        let height = img.height;

        // Square center crop
        const minSide = Math.min(width, height);
        const startX = (width - minSide) / 2;
        const startY = (height - minSide) / 2;

        canvas.width = maxDim;
        canvas.height = maxDim;

        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, startX, startY, minSide, minSide, 0, 0, maxDim, maxDim);

        // Export as WebP or JPEG fallback (quality 0.82, produces tiny ~10-15KB string)
        const mimeType = "image/webp";
        let dataUrl = canvas.toDataURL(mimeType, 0.82);
        if (!dataUrl.startsWith("data:image/webp")) {
          dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Unable to process image."));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

export default function AvatarSelectionModal({
  isOpen,
  onClose,
  currentAvatar = "",
  userName = "User",
  onSave,
  isSaving = false,
}) {
  const [activeTab, setActiveTab] = useState("presets"); // "presets" | "upload"
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar || "");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedAvatar(currentAvatar || "");
      setUploadError("");
    }
  }, [isOpen, currentAvatar]);

  if (!isOpen) return null;

  const categories = ["All", "Animals", "Productivity", "Characters"];

  const filteredAvatars = PRESET_AVATARS.filter((av) =>
    categoryFilter === "All" ? true : av.category === categoryFilter
  );

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose a valid image file (PNG, JPG, WEBP).");
      return;
    }

    try {
      setUploadError("");
      const compressedDataUrl = await compressImageToThumbnail(file);
      setSelectedAvatar(compressedDataUrl);
      setActiveTab("upload");
    } catch (err) {
      console.error("Image upload processing error:", err);
      setUploadError("Failed to process image. Please try another image.");
    }
  };

  const handleRemoveAvatar = () => {
    setSelectedAvatar("");
  };

  const handleSave = () => {
    if (onSave) {
      onSave(selectedAvatar);
    }
  };

  const previewSrc = getAvatarUrl(selectedAvatar, userName);

  // Check if current selection matches a preset
  const currentPreset = PRESET_AVATARS.find(
    (av) => selectedAvatar === `avatar:${av.id}` || selectedAvatar === av.id
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#15161a] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-4 sm:px-6 py-3.5 dark:border-slate-800/80 shrink-0">
          <div>
            <h2 id="avatar-modal-title" className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Choose Profile Picture
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Personalize your Mindo experience with an illustrated avatar or custom photo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 no-scrollbar">
          {/* Active Preview Strip */}
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-[#1a1b20] p-3 sm:p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shrink-0">
            <div className="relative shrink-0">
              <img
                src={previewSrc}
                alt="Selected avatar preview"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover shadow-md border-2 border-indigo-500/80 ring-4 ring-indigo-500/20"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Preview
                </span>
                {currentPreset && (
                  <span className="text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                    {currentPreset.name}
                  </span>
                )}
                {selectedAvatar.startsWith("data:") && (
                  <span className="text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                    Custom Photo
                  </span>
                )}
                {!selectedAvatar && (
                  <span className="text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                    Default Initial
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">
                {userName}
              </p>
              {selectedAvatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="mt-1 text-[11px] text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Remove picture & use default
                </button>
              )}
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("presets")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === "presets"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Choose an Avatar
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === "upload"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Photo
            </button>
          </div>

          {/* TAB 1: PRESET AVATARS (Netflix-Inspired Grid) */}
          {activeTab === "presets" && (
            <div className="space-y-3">
              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      categoryFilter === cat
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grid of Character Avatars */}
              <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5 pt-1">
                {filteredAvatars.map((avatar) => {
                  const isSelected =
                    selectedAvatar === `avatar:${avatar.id}` ||
                    selectedAvatar === avatar.id;
                  const dataUrl = getAvatarUrl(avatar.id);

                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => setSelectedAvatar(`avatar:${avatar.id}`)}
                      className={`group relative flex flex-col items-center p-1.5 rounded-2xl transition-all cursor-pointer ${
                        isSelected
                          ? "bg-indigo-50/80 dark:bg-indigo-950/40 ring-2 ring-indigo-600 dark:ring-indigo-500 scale-105 shadow-md"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:scale-105 active:scale-95"
                      }`}
                      title={avatar.name}
                    >
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden shadow-sm">
                        <img
                          src={dataUrl}
                          alt={avatar.name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-indigo-600/25 flex items-center justify-center">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xs">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 mt-1 truncate max-w-full text-center">
                        {avatar.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD PHOTO */}
          {activeTab === "upload" && (
            <div className="space-y-4 py-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/50 dark:bg-slate-900/30 transition hover:bg-indigo-50/20"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 mb-3 shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  Click to upload photo from your device
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Supports JPG, PNG, WEBP. Automatically optimized and cropped to a crisp circle.
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  Choose Image
                </button>
              </div>

              {uploadError && (
                <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold p-3 rounded-xl text-center">
                  {uploadError}
                </div>
              )}

              {selectedAvatar.startsWith("data:") && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={selectedAvatar}
                      alt="Uploaded preview"
                      className="w-10 h-10 rounded-full object-cover border border-emerald-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Custom Photo Ready</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Compressed & optimized</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer: Cancel & Save */}
        <div className="border-t border-slate-200/80 px-4 sm:px-6 py-3.5 dark:border-slate-800/80 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50/60 dark:bg-[#121316]/60">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/25 transition flex items-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Avatar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
