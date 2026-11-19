"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getCurrentUser, isIndevMember, type User, getUsers, setTradingStatus } from "../../lib/auth";
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
    const { data, error } = await supabase.from("trades").select("*").eq("receiver_id", userId).eq("status", "pending");
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
      setAllUsers(getUsers().filter(user => user.id !== u.id));
      fetchIncomingTrades(u.id);
    }
  }, []);

  if (!currentUser) return <div className="p-20 text-center font-bold">Loading...</div>;
  if (!isIndevMember(currentUser)) return <div className="p-20 text-center font-bold text-red-500">You need INDEV Club to trade.</div>;

  const myLimitedItems = currentUser.ownedItems.map(id => ITEMS.find(i => i.id === id)).filter(i => i?.maxSupply !== undefined) as Item[];
  const theirLimitedItems = targetUser ? targetUser.ownedItems.map(id => ITEMS.find(i => i.id === id)).filter(i => i?.maxSupply !== undefined).map(item => ({ item: item!, serial: targetUser.itemSerials?.[item!.id] || 1 })) : [];

  const handleSendTrade = async () => {
    if (!targetUser) return;
    setIsSending(true);
    const { error } = await supabase.from("trades").insert({
      sender_id: currentUser.id,
      receiver_id: targetUser.id,
      sender_items: myOffer.map(o => ({ itemId: o.item.id, serial: o.serial })),
      receiver_items: theirOffer.map(o => ({ itemId: o.item.id, serial: o.serial })),
    });
    if (error) alert("Failed: " + error.message);
    else { alert(`Trade sent!`); window.location.reload(); }
    setIsSending(false);
  };

  const handleAcceptTrade = async (tradeId: string) => {
    // 🚨 THE FIX: Tell the auth system to STOP saving while we trade
    setTradingStatus(true);

    const { data, error } = await supabase.rpc("accept_trade", { p_trade_id: tradeId });
    if (error) {
      alert("Error: " + error.message);
      setTradingStatus(false); 
    } else if (!data.success) {
      alert("Failed: " + data.error);
      setTradingStatus(false); 
    } else {
      alert("Trade accepted!");
      window.location.reload(); 
    }
  };

  const handleDeclineTrade = async (tradeId: string) => {
    await supabase.from("trades").delete().eq("id", tradeId);
    setIncomingTrades(incomingTrades.filter(t => t.id !== tradeId));
    setViewingTrade(null);
  };

  return (
    <div className="min-h-screen bg-[#EEF0F7] text-[#1A1A2E] font-sans relative">
      {viewingTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setViewingTrade(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="font-black text-lg mb-4">Trade from {viewingTrade.sender_username}</h2>
            <div className="flex gap-4">
              <button onClick={() => handleDeclineTrade(viewingTrade.id)} className="flex-1 bg-red-100 text-red-600 font-bold py-2 rounded">Decline</button>
              <button onClick={() => handleAcceptTrade(viewingTrade.id)} className="flex-1 bg-green-500 text-white font-bold py-2 rounded">Accept</button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-gradient-to-b from-[#6C3CE0] to-[#5A2FC7] border-b-4 border-[#4A1FA8]">
        <div className="max-w-6xl mx-auto px-3 py-4 flex justify-between items-center">
          <VoxelioLogo />
          <div className="text-white font-bold bg-black/20 px-4 py-2 rounded-lg">🤝 Trade Center</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 py-8">
        <div className="mb-8 bg-white rounded-xl border-2 border-[#C5C8D6] p-4">
          <h2 className="font-black text-lg mb-4">Incoming Trades</h2>
          {loadingTrades ? <p>Loading...</p> : incomingTrades.length === 0 ? <p className="text-sm text-gray-500 italic">None</p> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incomingTrades.map(trade => (
                <div key={trade.id} className="bg-[#EEF0F7] p-4 rounded cursor-pointer hover:border-[#6C3CE0] border-2 border-transparent transition" onClick={() => setViewingTrade(trade)}>
                  <p className="font-bold">Trade from {trade.sender_username}</p>
                  <p className="text-xs text-gray-500 mt-1">{trade.sender_items.length} items</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {!targetUser ? (
          <div className="bg-white rounded-xl border-2 border-[#C5C8D6] p-6">
            <h2 className="text-2xl font-black mb-6 text-center">Select a Player</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {allUsers.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage).map(user => (
                <div key={user.id} onClick={() => setTargetUser(user)} className="cursor-pointer bg-[#EEF0F7] p-4 rounded hover:border-[#6C3CE0] border-2 border-transparent transition flex flex-col items-center">
                  <Avatar config={user.avatarConfig} size={80} />
                  <p className="font-bold mt-2">{user.username}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl border-2 border-[#C5C8D6] p-4 h-[500px] flex flex-col">
              <h2 className="font-black text-lg mb-4 text-center">Your Items</h2>
              <div className="flex-1 overflow-y-auto space-y-2">
                {myLimitedItems.map(item => (
                  <div key={item.id} onClick={() => !myOffer.some(o => o.item.id === item.id) && setMyOffer([...myOffer, { item, serial: currentUser.itemSerials?.[item.id] || 1 }])} className="bg-[#EEF0F7] p-2 rounded cursor-pointer flex justify-between">
                    <p className="font-bold text-xs">{item.name}</p>
                    <p className="text-xs text-[#B8860B]">#{currentUser.itemSerials?.[item.id] || "?"}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border-2 border-[#C5C8D6] p-4 h-[500px] flex flex-col">
              <h2 className="font-black text-lg mb-4 text-center">Their Items</h2>
              <div className="flex-1 overflow-y-auto space-y-2">
                {theirLimitedItems.map(inv => (
                  <div key={inv.item.id} onClick={() => !theirOffer.some(o => o.item.id === inv.item.id) && setTheirOffer([...theirOffer, inv])} className="bg-[#FEF2F2] p-2 rounded cursor-pointer flex justify-between">
                    <p className="font-bold text-xs">{inv.item.name}</p>
                    <p className="text-xs text-[#B8860B]">#{inv.serial}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 flex-1">
                <div className="bg-white p-3 rounded border-2 border-green-500 h-[350px]">
                  <h3 className="text-center font-bold text-green-600">You Give</h3>
                  {myOffer.map(o => <div key={o.item.id} className="bg-[#EEF0F7] p-2 rounded mt-2 flex justify-between"><span className="text-xs font-bold">{o.item.name}</span><button onClick={() => setMyOffer(myOffer.filter(x => x.item.id !== o.item.id))} className="text-red-500 font-bold">✕</button></div>)}
                </div>
                <div className="bg-white p-3 rounded border-2 border-red-500 h-[350px]">
                  <h3 className="text-center font-bold text-red-600">You Receive</h3>
                  {theirOffer.map(o => <div key={o.item.id} className="bg-[#EEF0F7] p-2 rounded mt-2 flex justify-between"><span className="text-xs font-bold">{o.item.name}</span><button onClick={() => setTheirOffer(theirOffer.filter(x => x.item.id !== o.item.id))} className="text-red-500 font-bold">✕</button></div>)}
                </div>
              </div>
              <div className="bg-white p-4 rounded flex justify-between items-center">
                <button onClick={() => setTargetUser(null)} className="text-sm font-bold text-[#6C3CE0]">← Back</button>
                <button onClick={handleSendTrade} disabled={isSending} className="bg-[#7B4FF7] text-white px-6 py-2 rounded font-bold disabled:opacity-50">Send Offer</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}