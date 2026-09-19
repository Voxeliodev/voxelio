"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { verifyLogin, getUsers, getCurrentUser, signOut, formatVoxbux, getUnreadCount } from "../../lib/auth";
import type { User } from "../../lib/auth";
import AccountBadge from "../components/AccountBadge";

export default function SignInPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  const addDebug = (msg: string) => {
    setDebugInfo((prev) => [...prev, msg]);
  };

  useEffect(() => {
    const hasStorage = typeof window !== "undefined" && typeof localStorage !== "undefined";
    addDebug(`✅ Signin page loaded at ${new Date().toLocaleTimeString()}`);
    addDebug(`localStorage available: ${hasStorage ? "YES" : "NO"}`);

    if (hasStorage) {
      try {
        const users = getUsers();
        addDebug(`Accounts found: ${users.length}`);
        if (users.length > 0) {
          users.forEach((u) => {
            addDebug(`  → "${u.username}" (ID: ${u.id}, Balance: ${formatVoxbux(u.voxbux)})`);
          });
        } else {
          addDebug(`⚠️ NO ACCOUNTS FOUND — sign up first!`);
        }

        const session = getCurrentUser();
        if (session) {
          addDebug(`Currently signed in as: "${session.username}"`);
        } else {
          addDebug(`No active session.`);
        }
        setCurrentUser(session);
      } catch (err) {
        addDebug(`❌ Error reading storage: ${String(err)}`);
      }
    }
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setCurrentUser(null);
    addDebug("🚪 Signed out.");
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!username.trim()) newErrors.username = "Username is required.";
    if (!password) newErrors.password = "Password is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDebugInfo([]);
    addDebug("=== SIGN IN CLICKED ===");
    addDebug(`Username typed: "${username}"`);

    const valid = validate();
    addDebug(`Validation passed: ${valid ? "YES" : "NO"}`);

    if (!valid) {
      addDebug("❌ Stopped — fix the errors above.");
      return;
    }

    addDebug("Calling verifyLogin...");

    let result;
    try {
      result = await verifyLogin(username, password);
      addDebug(`verifyLogin returned: ${JSON.stringify(result)}`);
    } catch (err) {
      addDebug(`❌ verifyLogin THREW AN ERROR: ${String(err)}`);
      return;
    }

    if (!result.success) {
      addDebug(`❌ Sign in failed: ${result.error}`);
      if (result.error?.toLowerCase().includes("username")) {
        setErrors({ username: result.error });
      } else {
        setErrors({ password: result.error || "Sign in failed." });
      }
      return;
    }

    addDebug(`✅ SUCCESS! Signed in as "${result.user?.username}" (ID: ${result.user?.id})`);
    setCurrentUser(result.user || null);
    setSubmitted(true);
  };

  const unreadCount = currentUser ? getUnreadCount(currentUser.id) : 0;

  const navTabs: any[] = [
    { name: "Home", href: "/" },
    { name: "Games", href: "/#discover" },
    { name: "Create", href: "/#create" },
    { name: "Catalog", href: "/catalog" },
    ...(currentUser?.id === "1" ? [{ name: "Dev", href: "/dev", dev: true }] : []),
    { name: "Friends", href: "/friends" },
    { name: "Messages", href: "/messages" },
    { name: "Avatar", href: "/avatar" },
    { name: "INDEV Club", href: "/indev", special: true },
  ];

  return (
    <div className="min-h-screen bg-[#EEF0F7] text-[#1A1A2E] font-sans">

      <div className="bg-[#1A1A2E] text-white text-xs">
        <div className="max-w-6xl mx-auto px-3 py-1.5 flex justify-between items-center">
          <div className="flex gap-4 items-center">
            {currentUser ? (
              <>
                <span className="text-gray-400">
                  Welcome,{" "}
                  <strong className="text-white inline-flex items-center">
                    {currentUser.username}
                    <AccountBadge userId={currentUser.id} size={12} />
                  </strong>
                </span>
                <button onClick={handleSignOut} className="hover:text-[#00E5FF]">
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <span className="text-gray-400">Welcome, Guest</span>
                <Link href="/signup" className="hover:text-[#00E5FF]">Sign Up</Link>
                <Link href="/signin" className="hover:text-[#00E5FF] font-bold text-[#00E5FF]">Sign In</Link>
              </>
            )}
          </div>
          <div className="flex gap-4">
            <span>
              Voxbux:{" "}
              <strong className="text-[#FFD700]">
                {currentUser ? formatVoxbux(currentUser.voxbux) : "? V$"}
              </strong>
            </span>
            <Link href="#" className="hover:text-[#00E5FF]">Help</Link>
          </div>
        </div>
      </div>

      <header className="bg-gradient-to-b from-[#6C3CE0] to-[#5A2FC7] border-b-4 border-[#4A1FA8]">
        <div className="max-w-6xl mx-auto px-3 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/voxelio-logo.png"
              alt="Voxelio Logo"
              className="h-14 w-auto object-contain bg-white rounded px-4 py-1.5 shadow-md"
            />
          </Link>
          <div className="hidden md:flex items-center gap-2 bg-white/10 rounded px-3 py-1.5 border border-white/20">
            <input
              type="text"
              placeholder="Search worlds..."
              className="bg-transparent text-white placeholder-white/60 text-sm outline-none w-48"
            />
            <button className="text-white text-sm">🔍</button>
          </div>
        </div>
      </header>

      <nav className="bg-[#4A1FA8] border-b-2 border-[#2D1070]">
        <div className="max-w-6xl mx-auto px-3 flex flex-wrap">
          {navTabs.map((tab) => (
            <Link
              key={tab.name}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-bold border-r border-[#3A1580] transition relative ${
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
              {tab.name === "Messages" && unreadCount > 0 && (
                <span className="ml-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      </nav>

      <div className="bg-black text-green-400 font-mono text-xs border-b-4 border-yellow-500">
        <div className="max-w-6xl mx-auto px-3 py-2">
          <div className="flex justify-between items-center">
            <strong className="text-yellow-400">🔍 DEBUG PANEL</strong>
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="bg-yellow-500 text-black px-2 py-0.5 rounded text-[10px] font-bold"
            >
              {showDebug ? "HIDE" : "SHOW"}
            </button>
          </div>
          {showDebug && (
            <div className="space-y-0.5 max-h-48 overflow-y-auto mt-1">
              {debugInfo.length === 0 ? (
                <div className="text-gray-500 italic">Waiting for actions...</div>
              ) : (
                debugInfo.map((msg, i) => (
                  <div key={i}>{msg}</div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-3 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">

        <aside className="lg:col-span-1 space-y-4">
          <div className="bg-white border-2 border-[#C5C8D6] rounded">
            <div className="bg-[#6C3CE0] text-white text-sm font-bold px-3 py-2 rounded-t border-b border-[#4A1FA8]">
              New to Voxelio?
            </div>
            <div className="p-3 text-sm space-y-3">
              <p className="text-[#666] text-xs">
                Create a free account in seconds and start building worlds today.
              </p>
              <Link
                href="/signup"
                className="block text-center w-full bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm py-2 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
              >
                Create Free Account
              </Link>
            </div>
          </div>

          <div className="bg-white border-2 border-[#C5C8D6] rounded">
            <div className="bg-[#6C3CE0] text-white text-sm font-bold px-3 py-2 rounded-t border-b border-[#4A1FA8]">
              Stay Safe
            </div>
            <div className="p-3 text-xs text-[#666] space-y-2">
              <p>🔒 Never share your password with anyone.</p>
              <p>⚠️ Voxelio staff will never ask for your password.</p>
            </div>
          </div>
        </aside>

        <div className="lg:col-span-3">
          <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
            <div className="bg-[#6C3CE0] text-white text-base font-black px-4 py-3 border-b-2 border-[#4A1FA8]">
              Sign In to Voxelio
            </div>

            {submitted ? (
              <div className="p-12 text-center">
                <div className="text-7xl mb-4">👋</div>
                <h2 className="text-2xl font-black text-[#1A1A2E] mb-2 inline-flex items-center justify-center gap-1">
                  Welcome back, {username}
                  {currentUser && <AccountBadge userId={currentUser.id} size={22} />}
                </h2>
                <p className="text-sm text-[#666] mb-6 max-w-md mx-auto">
                  You're signed in. Head to the homepage to start exploring worlds.
                </p>
                <Link
                  href="/"
                  className="inline-block bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm px-6 py-2.5 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
                >
                  Go to Home
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-5">

                <div>
                  <label className="block text-sm font-bold text-[#1A1A2E] mb-1">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your username"
                    className={`w-full border-2 rounded px-3 py-2 text-sm outline-none transition ${
                      errors.username
                        ? "border-red-400 focus:border-red-500"
                        : "border-[#C5C8D6] focus:border-[#6C3CE0]"
                    }`}
                  />
                  {errors.username && (
                    <p className="text-xs text-red-500 mt-1">{errors.username}</p>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-bold text-[#1A1A2E]">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <Link href="#" className="text-xs text-[#6C3CE0] hover:underline font-bold">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your password"
                      className={`w-full border-2 rounded px-3 py-2 pr-12 text-sm outline-none transition ${
                        errors.password
                          ? "border-red-400 focus:border-red-500"
                          : "border-[#C5C8D6] focus:border-[#6C3CE0]"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#6C3CE0] font-bold px-2 py-1 hover:bg-[#EEF0F7] rounded"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="accent-[#6C3CE0]"
                  />
                  <label htmlFor="remember" className="text-xs text-[#666] cursor-pointer">
                    Keep me signed in on this device
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-black text-base py-3 rounded border-2 border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition shadow-md"
                >
                  🔓 Sign In
                </button>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-[#E5E7F0]"></div>
                  <span className="text-xs text-[#888] font-bold">OR</span>
                  <div className="flex-1 h-px bg-[#E5E7F0]"></div>
                </div>

                <div className="text-center">
                  <p className="text-xs text-[#666] mb-2">Don't have an account yet?</p>
                  <Link
                    href="/signup"
                    className="inline-block w-full bg-[#EEF0F7] text-[#4A1FA8] font-bold text-sm py-2.5 rounded border-2 border-[#C5C8D6] hover:bg-[#E0E3EE] transition"
                  >
                    Create a Free Account
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-[#1A1A2E] text-white mt-8 border-t-4 border-[#4A1FA8]">
        <div className="max-w-6xl mx-auto px-3 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div>
              <h4 className="font-bold mb-2 text-[#00E5FF]">Voxelio</h4>
              <ul className="space-y-1 text-gray-400 text-xs">
                <li><Link href="#" className="hover:text-white">About Us</Link></li>
                <li><Link href="#" className="hover:text-white">Careers</Link></li>
                <li><Link href="#" className="hover:text-white">Press</Link></li>
                <li><Link href="#" className="hover:text-white">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-2 text-[#00E5FF]">Community</h4>
              <ul className="space-y-1 text-gray-400 text-xs">
                <li><Link href="#" className="hover:text-white">Forums</Link></li>
                <li><Link href="#" className="hover:text-white">Discord</Link></li>
                <li><Link href="#" className="hover:text-white">Events</Link></li>
                <li><Link href="#" className="hover:text-white">Developer Hub</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-2 text-[#00E5FF]">Support</h4>
              <ul className="space-y-1 text-gray-400 text-xs">
                <li><Link href="#" className="hover:text-white">Help Center</Link></li>
                <li><Link href="#" className="hover:text-white">Safety</Link></li>
                <li><Link href="#" className="hover:text-white">Report Abuse</Link></li>
                <li><Link href="#" className="hover:text-white">Parental Controls</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-2 text-[#00E5FF]">Legal</h4>
              <ul className="space-y-1 text-gray-400 text-xs">
                <li><Link href="#" className="hover:text-white">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-white">DMCA</Link></li>
                <li><Link href="#" className="hover:text-white">Cookies</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-6 pt-4 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-gray-500">
            <p>© 2026 Voxelio. All rights reserved. Voxelio is not affiliated with any other platform.</p>
            <div className="flex gap-3">
              <Link href="#" className="hover:text-white">𝕏</Link>
              <Link href="#" className="hover:text-white">▶</Link>
              <Link href="#" className="hover:text-white">💬</Link>
              <Link href="#" className="hover:text-white">♪</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}