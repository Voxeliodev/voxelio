"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getCurrentUser, isIndevMember, type User } from "../../lib/auth";
import { ITEMS, type Item } from "../../lib/items";
import ItemPreview from "../components/ItemPreview";
import VoxelioLogo from "../components/VoxelioLogo";
import AccountBadge from "../components/AccountBadge";

// Mock data for the person you are trading with
const MOCK_TARGET_USER = {
  id: "user-456",
  username: "CrazyVox",
  inventory: [{ itemId: "hat-golden-vox", serial: 2 }], 
};

export default function TradePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [myOffer, setMyOffer] = useState<{ item: Item; serial: number }[]>([]);
  const [theirOffer, setTheirOffer] = useState<{ item: Item; serial: number }[]>([]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    // Load user
    const u = getCurrentUser();
    setCurrentUser(u);
  }, []);

  if (!currentUser) {
    return <div className="p-20 text-center font-bold">Loading...</div>;
  }

  // 🔒 1. INDEV CLUB PAYWALL (Using your actual auth function)
  const hasIndevClub = isIndevMember(currentUser);

  const navTabs: any[] = [
    { name: "Home", href: "/" },
    { name: "Games", href: "/games" },
    { name: "Create", href: "/create" },
    { name: "Catalog", href: "/catalog" },
    ...(currentUser?.id === "1" ? [{ name: "Dev", href: "/dev", dev: true }] : []),
    { name: "Friends", href: "/friends" },
    { name: "Messages", href: "/messages" },
    { name: "Avatar", href: "/avatar" },
    { name: "Trading", href: "/trade", active: true },
    { name: "INDEV Club", href: "/indev", special: true },
  ];

  if (!hasIndevClub) {
    return (
      <div className="min-h-screen bg-[#EEF0F7] text-[#1A1A2E] font-sans">
        <header className="bg-gradient-to-b from-[#6C3CE0] to-[#5A2FC7] border-b-4 border-[#4A1FA8]">
          <div className="max-w-6xl mx-auto px-3 py-4 flex items-center justify-between">
            <VoxelioLogo />
          </div>
        </header>
        <nav className="bg-[#4A1FA8] border-b-2 border-[#2D1070]">
          <div className="max-w-6xl mx-auto px-3 flex flex-wrap">
            {navTabs.map((tab) => (
              <Link
                key={tab.name}
                href={tab.href}
                className={`px-4 py-2.5 text-sm font-bold border-r border-[#3A1580] transition ${
                  tab.active ? "bg-[#EEF0F7] text-[#4A1FA8]" : "text-white hover:bg-[#3A1580]"
                }`}
              >
                {tab.name}
              </Link>
            ))}
          </div>
        </nav>

        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
          <h1 className="text-4xl font-black mb-4 text-[#FFD700]" style={{ textShadow: "1px 1px 0 #000" }}>🔒 Trade Locked</h1>
          <p className="text-gray-600 mb-6 max-w-md font-semibold">
            You must be a member of the <strong className="text-[#FFD700] bg-[#4A1FA8] px-2 py-1 rounded">INDEV Club</strong> to trade limited items with other players.
          </p>
          <Link href="/indev" className="bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] hover:from-[#8B5FFF] hover:to-[#6A3FD7] text-white px-8 py-3 rounded font-black border-2 border-[#4A1FA8] transition shadow-lg">
            Join INDEV Club
          </Link>
        </div>
      </div>
    );
  }

  // Filter your inventory for LIMITED items only
  const myLimitedItems = currentUser.ownedItems
    .map((id) => ITEMS.find((i) => i.id === id))
    .filter((item): item is Item => item !== undefined && item.maxSupply !== undefined);

  // Handlers
  const addToMyOffer = (item: Item) => {
    if (myOffer.some((o) => o.item.id === item.id)) return;
    const serial = currentUser.itemSerials?.[item.id] || 1;
    setMyOffer([...myOffer, { item, serial }]);
  };

  const removeFromMyOffer = (itemId: string) => {
    setMyOffer(myOffer.filter((o) => o.item.id !== itemId));
  };

  const removeFromTheirOffer = (itemId: string) => {
    setTheirOffer(theirOffer.filter((o) => o.item.id !== itemId));
  };

  const handleSendTrade = () => {
    if (myOffer.length === 0) return alert("You must offer at least one item.");
    setIsSending(true);
    setTimeout(() => {
      alert("Trade sent! They have 5 minutes to accept.");
      setIsSending(false);
      setMyOffer([]);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#EEF0F7] text-[#1A1A2E] font-sans">
      
      {/* HEADER */}
      <header className="bg-gradient-to-b from-[#6C3CE0] to-[#5A2FC7] border-b-4 border-[#4A1FA8]">
        <div className="max-w-6xl mx-auto px-3 py-4 flex items-center justify-between">
          <VoxelioLogo />
          <div className="text-white font-bold text-sm bg-black/20 px-4 py-2 rounded-lg border border-white/20">
            🤝 Trade Center
          </div>
        </div>
      </header>

      {/* NAV */}
      <nav className="bg-[#4A1FA8] border-b-2 border-[#2D1070]">
        <div className="max-w-6xl mx-auto px-3 flex flex-wrap">
          {navTabs.map((tab) => (
            <Link
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
            </Link>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-3 py-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT: Your Inventory */}
          <div className="bg-white rounded-xl border-2 border-[#C5C8D6] p-4 h-[600px] flex flex-col">
            <h2 className="font-black text-lg mb-4 text-[#4A1FA8] border-b-2 border-[#EEF0F7] pb-2">Your Limited Items</h2>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {myLimitedItems.length === 0 ? (
                <p className="text-gray-500 text-sm italic">You don't own any limited items.</p>
              ) : (
                myLimitedItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => addToMyOffer(item)}
                    className="flex items-center gap-3 bg-[#EEF0F7] p-2 rounded border border-[#C5C8D6] hover:border-[#6C3CE0] cursor-pointer transition shadow-sm"
                  >
                    <div className="w-12 h-12 bg-white rounded border border-[#C5C8D6] flex items-center justify-center text-xl">
                      {item.previewEmoji}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-[#1A1A2E]">{item.name}</p>
                      <p className="text-xs text-[#B8860B] font-bold">Serial #{currentUser.itemSerials?.[item.id] || "?"}</p>
                    </div>
                    <button className="text-xs font-bold text-white bg-[#6C3CE0] px-3 py-1 rounded">Add</button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* MIDDLE: The Trade Board */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            <div className="grid grid-cols-2 gap-4 flex-1">
              
              {/* YOUR OFFER */}
              <div className="bg-white rounded-xl border-2 border-[#22C55E] p-4 flex flex-col relative shadow-sm">
                <div className="absolute top-0 left-0 w-full bg-[#22C55E]/10 text-[#22C55E] font-black text-center text-xs py-1 rounded-t-xl border-b border-[#22C55E]/20">
                  YOU GIVE
                </div>
                <div className="mt-8 space-y-2 flex-1 overflow-y-auto">
                  {myOffer.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                      Select items from inventory
                    </div>
                  ) : (
                    myOffer.map((offer) => (
                      <div key={offer.item.id} className="flex items-center justify-between bg-[#EEF0F7] p-3 rounded border border-[#C5C8D6]">
                        <div>
                          <p className="font-bold text-sm text-[#1A1A2E]">{offer.item.name}</p>
                          <p className="text-xs text-[#B8860B] font-bold">Serial #{offer.serial}</p>
                        </div>
                        <button onClick={() => removeFromMyOffer(offer.item.id)} className="text-red-500 font-black hover:text-red-700">✕</button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* THEIR OFFER */}
              <div className="bg-white rounded-xl border-2 border-[#EF4444] p-4 flex flex-col relative shadow-sm">
                <div className="absolute top-0 left-0 w-full bg-[#EF4444]/10 text-[#EF4444] font-black text-center text-xs py-1 rounded-t-xl border-b border-[#EF4444]/20">
                  YOU RECEIVE
                </div>
                <div className="mt-8 space-y-2 flex-1 overflow-y-auto">
                  {theirOffer.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                      <p className="mb-2">Add item from {MOCK_TARGET_USER.username}</p>
                      <button 
                        onClick={() => {
                           const item = ITEMS.find(i => i.id === "hat-golden-vox");
                           if(item) setTheirOffer([{ item, serial: 2 }]);
                        }}
                        className="text-xs bg-[#EEF0F7] text-[#4A1FA8] font-bold px-3 py-1 rounded hover:bg-[#E0E3EE] border border-[#C5C8D6]"
                      >
                        (Simulate Them Adding Item)
                      </button>
                    </div>
                  ) : (
                    theirOffer.map((offer) => (
                      <div key={offer.item.id} className="flex items-center justify-between bg-[#EEF0F7] p-3 rounded border border-[#C5C8D6]">
                        <div>
                          <p className="font-bold text-sm text-[#1A1A2E]">{offer.item.name}</p>
                          <p className="text-xs text-[#B8860B] font-bold">Serial #{offer.serial}</p>
                        </div>
                        <button onClick={() => removeFromTheirOffer(offer.item.id)} className="text-red-500 font-black hover:text-red-700">✕</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="bg-white rounded-xl border-2 border-[#C5C8D6] p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Status</p>
                <p className="font-black text-[#1A1A2E]">Ready to send offer</p>
              </div>
              <button
                onClick={handleSendTrade}
                disabled={myOffer.length === 0 || isSending}
                className={`px-8 py-3 rounded-lg font-black border-2 transition shadow-md ${
                  myOffer.length > 0
                    ? "bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7]"
                    : "bg-[#EEF0F7] text-gray-400 border-[#C5C8D6] cursor-not-allowed"
                }`}
              >
                {isSending ? "Sending..." : "Send Trade Offer"}
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}