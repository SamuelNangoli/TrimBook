"use client";

import { useRef, useState } from "react";
import { Camera, Upload, Trash2 } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Photo control for profile pictures. Lets the user take a photo (camera on
 * mobile) or upload one, then compresses it client-side to a small JPEG data
 * URL so the payload stays tiny and needs no external file storage.
 *
 * The compressed data URL is written to a hidden input named `name` so it
 * submits with the surrounding form.
 */
export function PhotoUpload({
  name,
  personName,
  defaultValue,
}: {
  name: string;
  personName: string;
  defaultValue?: string | null;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function pick(capture: boolean) {
    const input = fileRef.current;
    if (!input) return;
    // `capture` opens the camera on mobile; ignored on desktop (file picker).
    if (capture) input.setAttribute("capture", "environment");
    else input.removeAttribute("capture");
    input.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await compressImage(file);
      setValue(dataUrl);
    } catch {
      toast.error("Couldn't process that image. Try another.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar name={personName || "?"} src={value || null} className="size-16 text-lg" />

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => pick(true)}>
            <Camera className="size-4" /> Take photo
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => pick(false)}>
            <Upload className="size-4" /> Upload
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setValue("")}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" /> Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {busy ? "Processing photo…" : "JPG or PNG. We shrink it automatically."}
        </p>
      </div>

      {/* Hidden native input + the value that submits with the form. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onFile}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
      />
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

/**
 * Resize to fit within `max`px (longest side) and re-encode as JPEG. Applies
 * EXIF orientation so phone photos aren't sideways.
 */
async function compressImage(file: File, max = 400, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no-canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}
