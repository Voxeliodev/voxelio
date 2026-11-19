"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getCurrentUser, isIndevMember, type User, getUsers, setTradingStatus } from "../../lib/auth"; // 👈 Imported setTradingStatus
import { supabase } from "../../lib/supabase";
import { ITEMS, type Item } from "../../lib/items";
import VoxelioLogo from "../components/VoxelioLogo";
import AccountBadge from "../components/AccountBadge";
import Avatar from "../components/Avatar";

type TradeOffer = {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_items: { itemId: string; serial: number }[];
  receiver_items: { itemId: string; serial: number }[];
  status: string;
  created_at: string;
  sender_username?: string;
};

export default function TradePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [myOffer, setMyOffer] = useState<{ item: Item; serial: number }[]>([]);
  const [theirOffer, setTheirOffer] = useState<{ item: Item; serial: number }[]>([]);
  const [isSending, setIsSending] = useState(false);
  
  const [incomingTrades, setIncomingTrades] = useState<TradeOffer[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(true);
  const [viewingTrade, setViewingTrade] = useState<TradeOffer | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 9;

  const fetchIncomingTrades = async (userId: string) => {
    setLoadingTrades(true);
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .eq("receiver_id", userId)
      .eq("status", "pending");

    if (!error && data) {
      const tradesWithNames = data.map((trade: any) => {
        const sender = getUsers().find(user => user.id === trade.sender_id);
        return { ...trade, sender_username: sender?.username || "Unknown Player" };
      });
      setIncomingTrades(tradesWithNames);
    }
    setLoadingTrades(false);
  };

  useEffect(() => {
    const u = getCurrentUser();
    setCurrentUser(u);
    
    if (u) {
      const users = getUsers().filter(user => user.id !== u.id);
      setAllUsers(users);
      fetchIncomingTrades(u.id);
    }
  }, []);

  if (!currentUser) {
    return <div className="p-20 text-center font-bold">Loading...</div>;
  }

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
              <Link key={tab.name} href={tab.href} className={`px-4 py-2.5 text-sm font-bold border-r border-[#3A1580] transition ${tab.active ? "bg-[#EEF0F7] text-[#4A1FA8]" : "text-white hover:bg-[#3A1580]"}`}>
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

  const myLimitedItems = currentUser.ownedItems
    .map((id) => ITEMS.find((i) => i.id === id))
    .filter((item): item is Item => item !== undefined && item.maxSupply !== undefined);

  const theirLimitedItems = targetUser 
    ? targetUser.ownedItems
        .map((id) => ITEMS.find((i) => i.id === id))
        .filter((item): item is Item => item !== undefined && item.maxSupply !== undefined)
        .map(item => ({
           item,
           serial: targetUser.itemSerials?.[item.id] || 1
        }))
    : [];

  const addToMyOffer = (item: Item) => {
    if (myOffer.some((o) => o.item.id === item.id)) return;
    const serial = currentUser.itemSerials?.[item.id] || 1;
    setMyOffer([...myOffer, { item, serial }]);
  };

  const removeFromMyOffer = (itemId: string) => {
    setMyOffer(myOffer.filter((o) => o.item.id !== itemId));
  };

  const addToTheirOffer = (item: Item, serial: number) => {
    if (theirOffer.some((o) => o.item.id === item.id)) return;
    setTheirOffer([...theirOffer, { item, serial }]);
  };

  const removeFromTheirOffer = (itemId: string) => {
    setTheirOffer(theirOffer.filter((o) => o.item.id !== itemId));
  };

  const handleSendTrade = async () => {
    if (myOffer.length === 0 && theirOffer.length === 0) return alert("You must offer at least one item.");
    if (!targetUser) return;
    
    setIsSending(true);

    const { error } = await supabase.from("trades").insert({
      sender_id: currentUser.id,
      receiver_id: targetUser.id,
      sender_items: myOffer.map(o => ({ itemId: o.item.id, serial: o.serial })),
      receiver_items: theirOffer.map(o => ({ itemId: o.item.id, serial: o.serial })),
    });

    if (error) {
      alert("Failed to send trade: " + error.message);
    } else {
      // 🚨 CRITICAL FIX: Strip the items from localStorage instantly to prevent overwrite
      try {
        const existing = JSON.parse(localStorage.getItem("voxelio_user") || "{}");
        if (existing.ownedItems) {
          existing.ownedItems = existing.ownedItems.filter(
            (id: string) => !myOffer.some(o => o.item.id === id)
          );
          if (existing.itemSerials) {
            myOffer.forEach(o => delete existing.itemSerials[o.item.id]);
          }
          localStorage.setItem("voxelio_user", JSON.stringify(existing));
        }
      } catch (e) {
        console.warn("Could not update local storage", e);
      }

      alert(`Trade sent to ${targetUser.username}!`);
      window.location.reload(); 
    }
    setIsSending(false);
  };

  const handleAcceptTrade = async (tradeId: string) => {
    // 🚨 THE FINAL FIX: Pause the auth system so it doesn't overwrite the DB
    setTradingStatus(true);

    const { data, error } = await supabase.rpc("accept_trade", { p_trade_id: tradeId });
    
    if (error) {
      alert("Error: " + error.message);
      setTradingStatus(false); // Unpause on fail
    } else if (!data.success) {
      alert("Trade failed: " + data.error);
      setTradingStatus(false); // Unpause on fail
    } else {
      alert("Trade accepted! Your items have been swapped.");
      window.location.reload(); 
    }
  };

  const handleDeclineTrade = async (tradeId: string) => {
    const { error } = await supabase.from("trades").delete().eq("id", tradeId);
    if (error) alert("Error declining: " + error.message);
    else {
      setIncomingTrades(incomingTrades.filter(t => t.id !== tradeId));
      setViewingTrade(null);
    }
  };

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = allUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(allUsers.length / usersPerPage);

  return (
    <div className="min-h-screen bg-[#EEF0F7] text-[#1A1A2E] font-sans relative">
      
      {viewingTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewingTrade(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border-2 border-[#C5C8D6]" onClick={e => e.stopPropagation()}>
            <div className="bg-[#4A1FA8] text-white px-4 py-3 flex justify-between items-center">
              <h2 className="font-black text-lg">Trade Offer from {viewingTrade.sender_username}</h2>
              <button onClick={() => setViewingTrade(null)} className="text-white/80 hover:text-white text-2xl font-black">×</button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-[#EEF0F7] border-2 border-[#C5C8D6] rounded-lg p-4">
                  <h3 className="text-sm font-black text-[#4A1FA8] mb-3 uppercase tracking-wider text-center border-b border-[#C5C8D6] pb-2">They Give You</h3>
                  <div className="space-y-2">
                    {viewingTrade.sender_items.map((i, idx) => {
                      const item = ITEMS.find(it => it.id === i.itemId);
                      return (
                        <div key={idx} className="flex items-center gap-3 bg-white p-2 rounded border border-[#C5C8D6]">
                          <div className="w-10 h-10 flex items-center justify-center text-xl bg-gray-50 rounded">{item?.previewEmoji || "❓"}</div>
                          <div>
                            <p className="text-sm font-bold text-[#1A1A2E]">{item?.name || i.itemId}</p>
                            <p className="text-[10px] font-black text-[#B8860B]">Serial #{i.serial}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="bg-[#EEF0F7] border-2 border-[#C5C8D6] rounded-lg p-4">
                  <h3 className="text-sm font-black text-[#EF4444] mb-3 uppercase tracking-wider text-center border-b border-[#C5C8D6] pb-2">You Give Them</h3>
                  <div className="space-y-2">
                    {viewingTrade.receiver_items.length === 0 ? (
                      <p className="text-xs text-gray-500 italic text-center py-4">Nothing (Free Item)</p>
                    ) : (
                      viewingTrade.receiver_items.map((i, idx) => {
                        const item = ITEMS.find(it => it.id === i.itemId);
                        return (
                          <div key={idx} className="flex items-center gap-3 bg-white p-2 rounded border border-[#C5C8D6]">
                            <div className="w-10 h-10 flex items-center justify-center text-xl bg-gray-50 rounded">{item?.previewEmoji || "❓"}</div>
                            <div>
                              <p className="text-sm font-bold text-[#1A1A2E]">{item?.name || i.itemId}</p>
                              <p className="text-[10px] font-black text-[#B8860B]">Serial #{i.serial}</p>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => handleDeclineTrade(viewingTrade.id)}
                  className="flex-1 bg-[#EEF0F7] text-[#EF4444] border-2 border-[#C5C8D6] hover:bg-red-50 hover:border-red-300 font-black py-3 rounded-lg transition"
                >
                  Decline
                </button>
                <button 
                  onClick={() => handleAcceptTrade(viewingTrade.id)}
                  className="flex-1 bg-gradient-to-b from-[#22C55E] to-[#16A34A] text-white border-2 border-[#15803D] hover:from-[#4ADE80] hover:to-[#22C55E] font-black py-3 rounded-lg transition shadow-md"
                >
                  Accept Trade
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="bg-gradient-to-b from-[#6C3CE0] to-[#5A2FC7] border-b-4 border-[#4A1FA8]">
        <div className="max-w-6xl mx-auto px-3 py-4 flex items-center justify-between">
          <VoxelioLogo />
          <div className="text-white font-bold text-sm bg-black/20 px-4 py-2 rounded-lg border border-white/20">
            🤝 Trade Center
          </div>
        </div>
      </header>

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
        
        <div className="mb-8 bg-white rounded-xl border-2 border-[#C5C8D6] p-4 shadow-sm">
          <h2 className="font-black text-lg text-[#4A1FA8] mb-4 border-b-2 border-[#EEF0F7] pb-2 flex justify-between items-center">
            Incoming Trade Offers
            <button onClick={() => fetchIncomingTrades(currentUser.id)} className="text-xs font-bold text-[#6C3CE0] hover:underline">
              Refresh
            </button>
          </h2>
          
          {loadingTrades ? (
            <p className="text-sm text-gray-500">Loading offers...</p>
          ) : incomingTrades.length === 0 ? (
            <p className="text-sm text-gray-500 italic">You have no pending trade offers.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incomingTrades.map((trade) => (
                <div 
                  key={trade.id} 
                  className="bg-[#EEF0F7] border border-[#C5C8D6] hover:border-[#6C3CE0] rounded p-4 flex items-center justify-between cursor-pointer transition shadow-sm"
                  onClick={() => setViewingTrade(trade)}
                >
                  <div>
                    <p className="text-sm font-bold">
                      Trade from <span className="text-[#6C3CE0]">{trade.sender_username}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{trade.sender_items.length} items offered</p>
                  </div>
                  <div className="bg-white px-3 py-1.5 rounded text-xs font-bold text-[#4A1FA8] border border-[#C5C8D6]">
                    View Details →
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!targetUser ? (
          <div className="bg-white rounded-xl border-2 border-[#C5C8D6] p-6 shadow-sm">
            <h2 className="text-2xl font-black text-[#4A1FA8] mb-6 text-center">Select a Player to Trade With</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {currentUsers.map(user => (
                <div 
                  key={user.id} 
                  onClick={() => setTargetUser(user)}
                  className="cursor-pointer bg-[#EEF0F7] border-2 border-[#C5C8D6] rounded-lg p-4 hover:border-[#6C3CE0] hover:shadow-md transition flex flex-col items-center justify-center"
                >
                  <Avatar config={user.avatarConfig} size={80} />
                  <p className="font-bold text-sm mt-3 truncate w-full text-center flex items-center justify-center">
                    {user.username}
                    <AccountBadge username={user.username} userId={user.id} size={14} />
                  </p>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#E5E7F0] pt-4">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 text-sm font-bold rounded border-2 transition ${currentPage === 1 ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "bg-white text-[#4A1FA8] border-[#C5C8D6] hover:border-[#6C3CE0]"}`}
                >
                  ← Previous
                </button>
                <span className="text-sm font-bold text-[#666]">Page {currentPage} of {totalPages}</span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 text-sm font-bold rounded border-2 transition ${currentPage === totalPages ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "bg-white text-[#4A1FA8] border-[#C5C8D6] hover:border-[#6C3CE0]"}`}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            <div className="bg-white rounded-xl border-2 border-[#C5C8D6] p-4 h-[500px] flex flex-col">
              <h2 className="font-black text-lg mb-4 text-[#4A1FA8] border-b-2 border-[#EEF0F7] pb-2 text-center">Your Items</h2>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {myLimitedItems.length === 0 ? (
                  <p className="text-gray-500 text-sm italic text-center mt-4">You don't own any limited items.</p>
                ) : (
                  myLimitedItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => addToMyOffer(item)}
                      className="flex items-center gap-2 bg-[#EEF0F7] p-2 rounded border border-[#C5C8D6] hover:border-[#6C3CE0] cursor-pointer transition shadow-sm"
                    >
                      <div className="w-10 h-10 bg-white rounded border border-[#C5C8D6] flex items-center justify-center text-lg">
                        {item.previewEmoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs text-[#1A1A2E] truncate">{item.name}</p>
                        <p className="text-[10px] text-[#B8860B] font-bold">#{currentUser.itemSerials?.[item.id] || "?"}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border-2 border-[#C5C8D6] p-4 h-[500px] flex flex-col">
              <h2 className="font-black text-lg mb-4 text-[#EF4444] border-b-2 border-[#EEF0F7] pb-2 text-center">Their Items</h2>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {theirLimitedItems.length === 0 ? (
                  <p className="text-gray-500 text-sm italic text-center mt-4">They don't own any limited items.</p>
                ) : (
                  theirLimitedItems.map((inv) => (
                    <div
                      key={inv.item.id}
                      onClick={() => addToTheirOffer(inv.item, inv.serial)}
                      className="flex items-center gap-2 bg-[#FEF2F2] p-2 rounded border border-[#FCA5A5] hover:border-[#EF4444] cursor-pointer transition shadow-sm"
                    >
                      <div className="w-10 h-10 bg-white rounded border border-[#FCA5A5] flex items-center justify-center text-lg">
                        {inv.item.previewEmoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs text-[#1A1A2E] truncate">{inv.item.name}</p>
                        <p className="text-[10px] text-[#B8860B] font-bold">#{inv.serial}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 flex-1">
                <div className="bg-white rounded-xl border-2 border-[#22C55E] p-3 flex flex-col relative shadow-sm h-[350px]">
                  <div className="absolute top-0 left-0 w-full bg-[#22C55E]/10 text-[#22C55E] font-black text-center text-[10px] py-1 rounded-t-xl border-b border-[#22C55E]/20 uppercase tracking-wider">
                    You Give
                  </div>
                  <div className="mt-6 space-y-2 flex-1 overflow-y-auto">
                    {myOffer.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-400 text-xs text-center border-2 border-dashed border-gray-200 rounded-lg">
                        Click your items<br/>to add them here
                      </div>
                    ) : (
                      myOffer.map((offer) => (
                        <div key={offer.item.id} className="flex items-center justify-between bg-[#EEF0F7] p-2 rounded border border-[#C5C8D6]">
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-[#1A1A2E] truncate">{offer.item.name}</p>
                            <p className="text-[10px] text-[#B8860B] font-bold">#{offer.serial}</p>
                          </div>
                          <button onClick={() => removeFromMyOffer(offer.item.id)} className="text-red-500 font-black hover:text-red-700 ml-2">✕</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl border-2 border-[#EF4444] p-3 flex flex-col relative shadow-sm h-[350px]">
                  <div className="absolute top-0 left-0 w-full bg-[#EF4444]/10 text-[#EF4444] font-black text-center text-[10px] py-1 rounded-t-xl border-b border-[#EF4444]/20 uppercase tracking-wider truncate px-1">
                    You Receive
                  </div>
                  <div className="mt-6 space-y-2 flex-1 overflow-y-auto">
                    {theirOffer.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-400 text-xs text-center border-2 border-dashed border-gray-200 rounded-lg">
                        Click their items<br/>to add them here
                      </div>
                    ) : (
                      theirOffer.map((offer) => (
                        <div key={offer.item.id} className="flex items-center justify-between bg-[#EEF0F7] p-2 rounded border border-[#C5C8D6]">
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-[#1A1A2E] truncate">{offer.item.name}</p>
                            <p className="text-[10px] text-[#B8860B] font-bold">#{offer.serial}</p>
                          </div>
                          <button onClick={() => removeFromTheirOffer(offer.item.id)} className="text-red-500 font-black hover:text-red-700 ml-2">✕</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border-2 border-[#C5C8D6] p-4 flex items-center justify-between shadow-sm">
                <button onClick={() => setTargetUser(null)} className="text-sm font-bold text-[#6C3CE0] hover:underline">
                  ← Back
                </button>
                <button
                  onClick={handleSendTrade}
                  disabled={(myOffer.length === 0 && theirOffer.length === 0) || isSending}
                  className={`px-6 py-2 rounded-lg font-black border-2 transition shadow-md ${
                    (myOffer.length > 0 || theirOffer.length > 0)
                      ? "bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7]"
                      : "bg-[#EEF0F7] text-gray-400 border-[#C5C8D6] cursor-not-allowed"
                  }`}
                >
                  {isSending ? "Sending..." : `Send to ${targetUser.username}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}