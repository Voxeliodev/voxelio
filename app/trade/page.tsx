"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getCurrentUser, type User } from "../../lib/auth";
import { ITEMS, type Item } from "../../lib/items";
import ItemPreview from "../components/ItemPreview";

// Mock data for the person you are trading with
const MOCK_TARGET_USER = {
  id: "user-456",
  username: "CrazyVox",
  isIndevClub: true,
  // Imagine they are offering their Golden Vox (Serial #2)
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

  // 🔒 1. INDEV CLUB PAYWALL
  const hasIndevClub = currentUser.username === "Rowan" || (currentUser as any).isIndevClub === true;

  if (!hasIndevClub) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A1E] text-white p-4">
        <h1 className="text-4xl font-black mb-4 text-[#FFD700]">🔒 Trade Locked</h1>
        <p className="text-gray-400 mb-6 text-center max-w-md">
          You must be a member of the <strong className="text-[#FFD700]">INDEV Club</strong> to trade limited items with other players.
        </p>
        <Link href="/indev" className="bg-[#6C3CE0] hover:bg-[#5A2FC7] px-8 py-3 rounded font-bold transition">
          Join INDEV Club
        </Link>
      </div>
    );
  }

  // Filter your inventory for LIMITED items only
  const myLimitedItems = currentUser.ownedItems
    .map((id) => ITEMS.find((i) => i.id === id))
    .filter((item): item is Item => item !== undefined && item.maxSupply !== undefined);

  // Handlers
  const addToMyOffer = (item: Item) => {
    if (myOffer.some((o) => o.item.id === item.id)) return; // Prevent dupes
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
    // IN A REAL APP: Here is where you call your Supabase API to create a trade record.
    setTimeout(() => {
      alert("Trade sent to CrazyVox! They have 5 minutes to accept.");
      setIsSending(false);
      setMyOffer([]);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-white p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
          <h1 className="text-3xl font-black text-[#FFD700]">🤝 Trade Center</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Trading with:</span>
            <span className="font-bold bg-[#1A1A2E] px-4 py-2 rounded border border-[#6C3CE0]">
              {MOCK_TARGET_USER.username}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT: Your Inventory */}
          <div className="bg-[#1A1A2E] rounded-xl border-2 border-[#2A2A4E] p-4 h-[600px] flex flex-col">
            <h2 className="font-bold text-lg mb-4 text-white">Your Limited Items</h2>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {myLimitedItems.length === 0 ? (
                <p className="text-gray-500 text-sm italic">You don't own any limited items.</p>
              ) : (
                myLimitedItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => addToMyOffer(item)}
                    className="flex items-center gap-3 bg-[#0A0A1E] p-2 rounded border border-[#3A3A5E] hover:border-[#FFD700] cursor-pointer transition"
                  >
                    <div className="w-12 h-12 bg-black rounded flex items-center justify-center text-xl">
                      {item.previewEmoji}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{item.name}</p>
                      <p className="text-xs text-[#FFD700]">Serial #{currentUser.itemSerials?.[item.id] || "?"}</p>
                    </div>
                    <button className="text-xs font-bold text-[#6C3CE0] bg-[#6C3CE0]/20 px-3 py-1 rounded">Add</button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* MIDDLE: The Trade Board (Roblox Style) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            <div className="grid grid-cols-2 gap-4 flex-1">
              
              {/* YOUR OFFER */}
              <div className="bg-[#1A1A2E] rounded-xl border-2 border-[#22C55E]/50 p-4 flex flex-col relative">
                <div className="absolute top-0 left-0 w-full bg-[#22C55E]/20 text-[#22C55E] font-bold text-center text-xs py-1 rounded-t-xl">
                  YOU GIVE
                </div>
                <div className="mt-6 space-y-2 flex-1 overflow-y-auto">
                  {myOffer.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500 text-sm border-2 border-dashed border-gray-700 rounded-lg">
                      Select items from inventory
                    </div>
                  ) : (
                    myOffer.map((offer) => (
                      <div key={offer.item.id} className="flex items-center justify-between bg-black/40 p-3 rounded border border-[#22C55E]/30">
                        <div>
                          <p className="font-bold text-sm">{offer.item.name}</p>
                          <p className="text-xs text-[#FFD700]">Serial #{offer.serial}</p>
                        </div>
                        <button onClick={() => removeFromMyOffer(offer.item.id)} className="text-red-400 hover:text-red-300">✕</button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* THEIR OFFER */}
              <div className="bg-[#1A1A2E] rounded-xl border-2 border-[#EF4444]/50 p-4 flex flex-col relative">
                <div className="absolute top-0 left-0 w-full bg-[#EF4444]/20 text-[#EF4444] font-bold text-center text-xs py-1 rounded-t-xl">
                  YOU RECEIVE
                </div>
                <div className="mt-6 space-y-2 flex-1 overflow-y-auto">
                  {theirOffer.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm border-2 border-dashed border-gray-700 rounded-lg p-4 text-center">
                      <p className="mb-2">Add item from {MOCK_TARGET_USER.username}</p>
                      
                      {/* Fake button to simulate them adding an item to test the UI */}
                      <button 
                        onClick={() => {
                           const item = ITEMS.find(i => i.id === "hat-golden-vox");
                           if(item) setTheirOffer([{ item, serial: 2 }]);
                        }}
                        className="text-xs bg-gray-800 px-3 py-1 rounded hover:bg-gray-700"
                      >
                        (Simulate Them Adding Item)
                      </button>
                    </div>
                  ) : (
                    theirOffer.map((offer) => (
                      <div key={offer.item.id} className="flex items-center justify-between bg-black/40 p-3 rounded border border-[#EF4444]/30">
                        <div>
                          <p className="font-bold text-sm">{offer.item.name}</p>
                          <p className="text-xs text-[#FFD700]">Serial #{offer.serial}</p>
                        </div>
                        <button onClick={() => removeFromTheirOffer(offer.item.id)} className="text-red-400 hover:text-red-300">✕</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="bg-[#1A1A2E] rounded-xl border-2 border-[#2A2A4E] p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Status</p>
                <p className="font-bold">Ready to send offer</p>
              </div>
              <button
                onClick={handleSendTrade}
                disabled={myOffer.length === 0 || isSending}
                className={`px-8 py-3 rounded font-black transition shadow-lg ${
                  myOffer.length > 0
                    ? "bg-gradient-to-b from-[#FFD700] to-[#F59E0B] text-black hover:scale-105"
                    : "bg-gray-700 text-gray-500 cursor-not-allowed"
                }`}
              >
                {isSending ? "Sending..." : "Send Trade Offer"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}