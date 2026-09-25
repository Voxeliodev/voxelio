"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, formatVoxbux, subscribeAuth, type User } from "../../../lib/auth";
import { isOwnerAccount } from "../../../lib/badges";
import { supabase } from "../../../lib/supabase";
import AccountBadge from "../../components/AccountBadge";
import NavLink from "../../components/NavLink";
import VoxelioLogo from "../../components/VoxelioLogo";

const MAX_FILE_SIZE_MB = 5;

export default function CreateShirtPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("100");
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
    const unsub = subscribeAuth(() => setUser(getCurrentUser()));
    return () => unsub();
  }, []);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      showToast("error", `File too big. Max ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }
    if (!f.type.startsWith("image/")) {
      showToast("error", "Only image files allowed.");
      return;
    }

    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleUpload = async () => {
    if (!user || !file) {
      showToast("error", "Pick an image first.");
      return;
    }
    if (!name.trim()) {
      showToast("error", "Give your shirt a name.");
      return;
    }
    const priceNum = parseInt(price, 10);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      showToast("error", "Price must be 0 or higher.");
      return;
    }

    setUploading(true);

    try {
      const ext = file.name.split(".").pop() || "png";
      const filename = `${user.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("shirt-uploads")
        .upload(filename, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        showToast("error", `Upload failed: ${uploadError.message}`);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("shirt-uploads")
        .getPublicUrl(filename);

      const publicUrl = urlData.publicUrl;

      const { error: dbError } = await supabase.from("community_shirts").insert({
        creator_id: user.id,
        creator_username: user.username,
        name: name.trim(),
        description: description.trim(),
        price: priceNum,
        image_url: publicUrl,
        status: "pending",
      });

      if (dbError) {
        showToast("error", `Database error: ${dbError.message}`);
        setUploading(false);
        return;
      }

      showToast("success", "Shirt uploaded! It's pending your approval in the Dev Console.");
      setFile(null);
      setPreviewUrl(null);
      setName("");
      setDescription("");
      setPrice("100");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      showToast("error", err?.message || "Something went wrong.");
    }

    setUploading(false);
  };

  const isOwner = isOwnerAccount(user?.username);

  const navTabs: any[] = [
    { name: "Home", href: "/" },
    { name: "Games", href: "/games" },
    { name: "Create", href: "/create", active: true },
    { name: "Catalog", href: "/catalog" },
    ...(isOwner ? [{ name: "Dev", href: "/dev", dev: true }] : []),
    { name: "Friends", href: "/friends" },
    { name: "Messages", href: "/messages" },
    { name: "Avatar", href: "/avatar" },
    { name: "INDEV Club", href: "/indev", special: true },
  ];

  if (!user || !isOwner) {
    return (
      <div className="min-h-screen bg-[#EEF0F7] text-[#1A1A2E] font-sans theme-container flex flex-col items-center justify-center p-8">
        <div className="bg-white border-2 border-red-300 rounded p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="font-black text-xl mb-2">Access Denied</h1>
          <p className="text-sm text-[#666] mb-4">
            Shirt uploading is currently restricted to the Voxelio owner.
          </p>
          <Link href="/catalog" className="text-sm font-bold text-[#6C3CE0] hover:underline">
            ← Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EEF0F7] text-[#1A1A2E] font-sans theme-container">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[60] px-4 py-2 rounded shadow-lg text-white text-sm font-bold max-w-sm ${
            toast.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="bg-[#1A1A2E] text-white text-xs">
        <div className="max-w-6xl mx-auto px-3 py-1.5 flex justify-between items-center">
          <div className="flex gap-4 items-center">
            <span className="text-gray-400">
              Welcome,{" "}
              <strong className="text-white inline-flex items-center">
                {user.username}
                <AccountBadge username={user.username} userId={user.id} size={12} />
              </strong>
            </span>
          </div>
          <span>
            Voxbux: <strong className="text-[#FFD700]">{formatVoxbux(user.voxbux)}</strong>
          </span>
        </div>
      </div>

      <header className="bg-gradient-to-b from-[#6C3CE0] to-[#5A2FC7] border-b-4 border-[#4A1FA8]">
        <div className="max-w-6xl mx-auto px-3 py-4 flex items-center justify-between">
          <VoxelioLogo />
        </div>
      </header>

      <nav className="bg-[#4A1FA8] border-b-2 border-[#2D1070]">
        <div className="max-w-6xl mx-auto px-3 flex flex-wrap">
          {navTabs.map((tab) => (
            <NavLink
              key={tab.name}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-bold border-r border-[#3A1580] transition ${
                tab.active
                  ? "bg-[#EEF0F7] text-[#4A1FA8]"
                  : tab.dev
                  ? "text-[#FF6B6B] hover:bg-[#3A1580]"
                  : tab.special
                  ? "text-[#FFD700] hover:bg-[#3A1580]"
                  : "text-white hover:bg-[#3A1580]"
              }`}
            >
              {tab.name}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-3 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-[#4A1FA8] mb-1">👕 Upload a Shirt</h1>
          <p className="text-sm text-[#666]">
            Upload a Roblox-style shirt template (585×559 px). It'll appear on the 3D avatar
            once you approve it in the Dev Console.
          </p>
        </div>

        <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
          <div className="bg-[#6C3CE0] text-white text-sm font-bold px-4 py-2 border-b border-[#4A1FA8]">
            Shirt Template
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1A1A2E] mb-2 uppercase tracking-wide">
                Image File (585×559 px)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="w-full text-sm border-2 border-[#C5C8D6] rounded p-2 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-[#6C3CE0] file:text-white file:font-bold file:cursor-pointer"
              />
            </div>

            {previewUrl && (
              <div className="border-2 border-[#C5C8D6] rounded p-3 bg-[#EEF0F7] text-center">
                <p className="text-[10px] font-bold text-[#666] uppercase mb-2">Preview</p>
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full max-h-64 mx-auto rounded border border-[#C5C8D6]"
                />
                <p className="text-[10px] text-[#888] mt-2">
                  Make sure the layout matches the Roblox template — otherwise it'll look scrambled.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#1A1A2E] mb-1 uppercase tracking-wide">
                Shirt Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Neon Dragon Tee"
                className="w-full border-2 border-[#C5C8D6] rounded px-3 py-2 text-sm outline-none focus:border-[#6C3CE0]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1A1A2E] mb-1 uppercase tracking-wide">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                placeholder="Describe your shirt..."
                rows={3}
                className="w-full border-2 border-[#C5C8D6] rounded px-3 py-2 text-sm outline-none focus:border-[#6C3CE0] resize-none"
              />
              <p className="text-[10px] text-[#888] mt-1">{description.length}/200</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1A1A2E] mb-1 uppercase tracking-wide">
                Price (Voxbux)
              </label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border-2 border-[#C5C8D6] rounded px-3 py-2 text-sm outline-none focus:border-[#6C3CE0]"
              />
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading || !file || !name.trim()}
              className={`w-full font-black text-base py-3 rounded border-2 transition ${
                uploading || !file || !name.trim()
                  ? "bg-[#EEF0F7] text-[#888] border-[#C5C8D6] cursor-not-allowed"
                  : "bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] shadow-md"
              }`}
            >
              {uploading ? "Uploading…" : "🚀 Upload Shirt"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}