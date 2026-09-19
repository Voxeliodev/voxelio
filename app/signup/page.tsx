"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createUser, getCurrentUser, signOut, formatVoxbux, getUnreadCount } from "../../lib/auth";
import type { User } from "../../lib/auth";
import { isOwnerAccount } from "../../lib/badges";
import AccountBadge from "../components/AccountBadge";
import NavLink from "../components/NavLink";

export default function SignUpPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [birthday, setBirthday] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setCurrentUser(null);
  };

  const getPasswordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ["Too Short", "Weak", "Okay", "Good", "Strong"];
  const strengthColors = ["bg-gray-300", "bg-red-400", "bg-yellow-400", "bg-blue-400", "bg-green-500"];

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!username.trim()) {
      newErrors.username = "Username is required.";
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters.";
    } else if (username.length > 20) {
      newErrors.username = "Username must be 20 characters or less.";
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = "Only letters, numbers, and underscores allowed.";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!password) {
      newErrors.password = "Password is required.";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    if (!birthday) {
      newErrors.birthday = "Birthday is required.";
    }

    if (!agreed) {
      newErrors.agreed = "You must agree to the Terms of Service.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    let result;
    try {
      result = await createUser({ username, email, password, birthday });
    } catch {
      setErrors({ username: "Something went wrong. Please try again." });
      return;
    }

    if (!result.success) {
      if (result.error?.toLowerCase().includes("username")) {
        setErrors({ username: result.error });
      } else if (result.error?.toLowerCase().includes("email")) {
        setErrors({ email: result.error });
      } else {
        setErrors({ username: result.error || "Something went wrong." });
      }
      return;
    }

    setCurrentUser(result.user || null);
    setSubmitted(true);
  };

  const unreadCount = currentUser ? getUnreadCount(currentUser.id) : 0;
  const isOwner = isOwnerAccount(currentUser?.username);

  const navTabs: any[] = [
    { name: "Home", href: "/" },
    { name: "Games", href: "/games" },
    { name: "Create", href: "/#create" },
    { name: "Catalog", href: "/catalog" },
    ...(isOwner ? [{ name: "Dev", href: "/dev", dev: true }] : []),
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
                    <AccountBadge username={currentUser.username} userId={currentUser.id} size={12} />
                  </strong>
                </span>
                <button onClick={handleSignOut} className="hover:text-[#00E5FF]">
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <span className="text-gray-400">Welcome, Guest</span>
                <Link href="/signin" className="hover:text-[#00E5FF]">Sign In</Link>
                <Link href="/signup" className="hover:text-[#00E5FF] font-bold text-[#00E5FF]">Sign Up</Link>
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
            <NavLink
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
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-3 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">

        <aside className="lg:col-span-1 space-y-4">
          <div className="bg-white border-2 border-[#C5C8D6] rounded">
            <div className="bg-[#6C3CE0] text-white text-sm font-bold px-3 py-2 rounded-t border-b border-[#4A1FA8]">
              Why Join?
            </div>
            <ul className="p-3 text-sm space-y-2 text-[#4A1FA8]">
              <li>✅ Free to play forever</li>
              <li>✅ Build unlimited worlds</li>
              <li>✅ Earn Voxbux as a creator</li>
              <li>✅ Connect with friends</li>
              <li>✅ Cross-world Nexus Gates</li>
            </ul>
          </div>

          <div className="bg-white border-2 border-[#C5C8D6] rounded">
            <div className="bg-[#6C3CE0] text-white text-sm font-bold px-3 py-2 rounded-t border-b border-[#4A1FA8]">
              Safety First
            </div>
            <div className="p-3 text-xs text-[#666] space-y-2">
              <p>🔒 We never share your email.</p>
              <p>👨‍👩‍👧 Parental controls available.</p>
              <p>🛡️ Advanced chat filtering.</p>
            </div>
          </div>

          <div className="bg-white border-2 border-[#C5C8D6] rounded">
            <div className="bg-[#6C3CE0] text-white text-sm font-bold px-3 py-2 rounded-t border-b border-[#4A1FA8]">
              Already a Member?
            </div>
            <div className="p-3">
              <Link
                href="/signin"
                className="block text-center w-full bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm py-2 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
              >
                Sign In Instead
              </Link>
            </div>
          </div>
        </aside>

        <div className="lg:col-span-3">
          <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
            <div className="bg-[#6C3CE0] text-white text-base font-black px-4 py-3 border-b-2 border-[#4A1FA8]">
              Create Your Voxelio Account
            </div>

            {submitted ? (
              <div className="p-12 text-center">
                <div className="text-7xl mb-4">🎉</div>
                <h2 className="text-2xl font-black text-[#1A1A2E] mb-2 inline-flex items-center justify-center gap-1">
                  Welcome, {username}
                  {currentUser && (
                    <AccountBadge username={currentUser.username} userId={currentUser.id} size={22} />
                  )}
                </h2>
                <p className="text-sm text-[#666] mb-6 max-w-md mx-auto">
                  Your account has been created successfully. You are now signed in
                  and ready to explore Voxelio.
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
                    placeholder="e.g. PixelBuilder99"
                    className={`w-full border-2 rounded px-3 py-2 text-sm outline-none transition ${
                      errors.username
                        ? "border-red-400 focus:border-red-500"
                        : "border-[#C5C8D6] focus:border-[#6C3CE0]"
                    }`}
                  />
                  <div className="flex justify-between mt-1">
                    {errors.username ? (
                      <p className="text-xs text-red-500">{errors.username}</p>
                    ) : (
                      <p className="text-xs text-[#888]">3-20 characters. Letters, numbers, underscores.</p>
                    )}
                    <p className="text-xs text-[#888]">{username.length}/20</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#1A1A2E] mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`w-full border-2 rounded px-3 py-2 text-sm outline-none transition ${
                      errors.email
                        ? "border-red-400 focus:border-red-500"
                        : "border-[#C5C8D6] focus:border-[#6C3CE0]"
                    }`}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#1A1A2E] mb-1">
                    Birthday <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className={`w-full border-2 rounded px-3 py-2 text-sm outline-none transition ${
                      errors.birthday
                        ? "border-red-400 focus:border-red-500"
                        : "border-[#C5C8D6] focus:border-[#6C3CE0]"
                    }`}
                  />
                  {errors.birthday && (
                    <p className="text-xs text-red-500 mt-1">{errors.birthday}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#1A1A2E] mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
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
                  {password && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded ${
                              i < strength ? strengthColors[strength] : "bg-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-[#888] mt-1">
                        Strength: <strong>{strengthLabels[strength]}</strong>
                      </p>
                    </div>
                  )}
                  {errors.password && (
                    <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#1A1A2E] mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Type password again"
                    className={`w-full border-2 rounded px-3 py-2 text-sm outline-none transition ${
                      errors.confirmPassword
                        ? "border-red-400 focus:border-red-500"
                        : "border-[#C5C8D6] focus:border-[#6C3CE0]"
                    }`}
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
                  )}
                </div>

                <div className="flex items-start gap-2 border-t border-[#E5E7F0] pt-4">
                  <input
                    type="checkbox"
                    id="agree"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 accent-[#6C3CE0]"
                  />
                  <label htmlFor="agree" className="text-xs text-[#666] cursor-pointer">
                    I agree to the{" "}
                    <Link href="#" className="text-[#6C3CE0] hover:underline font-bold">Terms of Service</Link>
                    {" "}and{" "}
                    <Link href="#" className="text-[#6C3CE0] hover:underline font-bold">Privacy Policy</Link>
                    . I confirm I am at least 13 years old.
                  </label>
                </div>
                {errors.agreed && (
                  <p className="text-xs text-red-500 -mt-3">{errors.agreed}</p>
                )}

                <button
                  type="submit"
                  className="w-full bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-black text-base py-3 rounded border-2 border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition shadow-md"
                >
                  🚀 Create My Account
                </button>

                <p className="text-xs text-center text-[#888]">
                  It's free and always will be. No credit card required.
                </p>
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