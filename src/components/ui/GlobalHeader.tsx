"use client";

import { useState, useRef, useEffect, useMemo, Suspense, useCallback } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { buildSignInUrl } from "@/lib/auth/signInUrl";
import Link from "next/link";

// ============================================
// Shared Styles
// ============================================
const styles = {
  buttonBase: `
    transition-all duration-200
    focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
  `,
  blueButton: `
    bg-blue-400/15 border border-blue-400/30 text-blue-200
    hover:bg-blue-400/25 hover:border-blue-400/50
    focus-visible:ring-blue-400
  `,
  redButton: `
    bg-red-500/15 border border-red-500/30 text-red-400
    hover:bg-red-500/25 hover:border-red-500/50
    focus-visible:ring-red-400
  `,
  header: "fixed top-4 right-4 z-[1000] flex flex-col items-end gap-2",
} as const;

// ============================================
// Icons
// ============================================
const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function HomeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...iconProps} width={size} height={size} aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function JourneyIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// ============================================
// Types
// ============================================
interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant: "blue" | "red";
  onClick: () => void;
}

interface HeaderWrapperProps {
  children: React.ReactNode;
  headerRef?: React.RefObject<HTMLDivElement | null>;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  ariaLabel: string;
}

interface DropdownMenuItemProps {
  index: number;
  focusedIndex: number;
  item: MenuItem;
  menuItemsRef: React.RefObject<HTMLButtonElement[]>;
}

// ============================================
// Header Wrapper Component
// ============================================
function HeaderWrapper({ children, headerRef, onKeyDown, ariaLabel }: HeaderWrapperProps) {
  return (
    <header
      ref={headerRef}
      className={styles.header}
      role="banner"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      {children}
    </header>
  );
}

// ============================================
// Home Button Component
// ============================================
function HomeButton() {
  const pathname = usePathname();
  const { t } = useI18n();

  if (pathname === "/" || pathname === "") {
    return null;
  }

  return (
    <Link
      href="/"
      className={`flex items-center justify-center w-9 h-9 rounded-full hover:scale-105
        ${styles.buttonBase} ${styles.blueButton}`}
      aria-label={t("nav.home") || "Go to home page"}
    >
      <HomeIcon size={18} />
    </Link>
  );
}

// ============================================
// Credit Display Component
// ============================================
function CreditDisplay() {
  const { data: session, status } = useSession();
  const { t } = useI18n();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") {return;}
    if (!session?.user) {
      setCredits(null);
      setLoading(false);
      return;
    }

    const fetchCredits = async () => {
      try {
        const res = await fetch("/api/me/credits");
        if (res.ok) {
          const data = await res.json();
          setCredits(data.credits?.remaining ?? 0);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    fetchCredits();

    const handleCreditUpdate = () => fetchCredits();
    window.addEventListener("credit-update", handleCreditUpdate);
    return () => window.removeEventListener("credit-update", handleCreditUpdate);
  }, [session, status]);

  if (status === "loading" || loading || !session?.user || credits === null) {
    return null;
  }

  return (
    <Link
      href="/pricing"
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl
        text-[13px] font-semibold no-underline
        ${styles.buttonBase} ${styles.blueButton}`}
      aria-label={t("credits.viewCredits") || `${credits} credits remaining, click to view pricing`}
    >
      <span className="text-yellow-400" aria-hidden="true">✦</span>
      <span>{credits}</span>
      <span className="text-blue-300/80 font-medium">{t("credits.label") || "크레딧"}</span>
    </Link>
  );
}

// ============================================
// Dropdown Menu Item Component
// ============================================
function DropdownMenuItem({ index, focusedIndex, item, menuItemsRef }: DropdownMenuItemProps) {
  const setRef = useCallback((el: HTMLButtonElement | null) => {
    if (el) {menuItemsRef.current[index] = el;}
  }, [index, menuItemsRef]);

  const variantStyles = item.variant === "blue" ? styles.blueButton : styles.redButton;

  return (
    <button
      ref={setRef}
      role="menuitem"
      tabIndex={focusedIndex === index ? 0 : -1}
      onClick={item.onClick}
      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
        text-sm font-medium cursor-pointer hover:-translate-y-0.5
        focus-visible:outline-none ${styles.buttonBase} ${variantStyles}`}
    >
      {item.icon}
      {item.label}
    </button>
  );
}

// ============================================
// Main GlobalHeaderContent Component
// ============================================
function GlobalHeaderContent() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const isMainPage = !pathname || pathname === "/" || pathname === "";
  const signInUrl = useMemo(() => buildSignInUrl(pathname || "/"), [pathname]);

  const [showDropdown, setShowDropdown] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuItemsRef = useRef<HTMLButtonElement[]>([]);

  const loading = status === "loading";
  const isAuthenticated = status === "authenticated";
  const name = session?.user?.name || session?.user?.email ||
    (isAuthenticated ? (t("common.account") || "Account") : null);

  // Dynamic menu items - automatically updates menuItemCount
  const menuItems: MenuItem[] = useMemo(() => [
    {
      id: "myjourney",
      label: t("nav.myJourney") || "My Journey",
      icon: <JourneyIcon />,
      variant: "blue",
      onClick: () => {
        setShowDropdown(false);
        router.push("/myjourney");
      },
    },
    {
      id: "logout",
      label: t("community.logout") || "Logout",
      icon: <LogoutIcon />,
      variant: "red",
      onClick: () => signOut({ callbackUrl: "/" }),
    },
  ], [t, router]);

  const menuItemCount = menuItems.length;

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showDropdown) {return;}
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  // Focus menu item when focusedIndex changes
  useEffect(() => {
    if (showDropdown && focusedIndex >= 0 && menuItemsRef.current[focusedIndex]) {
      menuItemsRef.current[focusedIndex].focus();
    }
  }, [focusedIndex, showDropdown]);

  // Reset focused index when dropdown closes
  useEffect(() => {
    if (!showDropdown) {setFocusedIndex(-1);}
  }, [showDropdown]);

  // Keyboard navigation for dropdown (WCAG 2.1 AA compliant)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setShowDropdown(true);
        setFocusedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setShowDropdown(false);
        triggerRef.current?.focus();
        break;
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % menuItemCount);
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + menuItemCount) % menuItemCount);
        break;
      case "Home":
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case "End":
        e.preventDefault();
        setFocusedIndex(menuItemCount - 1);
        break;
      case "Tab":
        setShowDropdown(false);
        break;
    }
  }, [showDropdown, menuItemCount]);

  const headerAriaLabel = t("nav.header") || "Site header";

  // Hide on main page
  if (isMainPage) {return null;}

  // Loading state
  if (loading) {
    return (
      <HeaderWrapper ariaLabel={headerAriaLabel}>
        <div className="flex items-center gap-3">
          <HomeButton />
          <div
            className="min-w-[80px] h-[34px] rounded-[20px] bg-blue-400/10 border border-transparent px-3.5 py-1.5"
            aria-hidden="true"
          />
        </div>
      </HeaderWrapper>
    );
  }

  // Not logged in
  if (!isAuthenticated) {
    return (
      <HeaderWrapper ariaLabel={headerAriaLabel}>
        <nav className="flex items-center gap-3" aria-label={t("nav.main") || "Main navigation"}>
          <HomeButton />
          <button
            onClick={() => router.push(signInUrl)}
            className={`text-[#EAE6FF] text-sm whitespace-nowrap px-3.5 py-1.5 rounded-[20px]
              backdrop-blur-md cursor-pointer border-blue-400/40
              ${styles.buttonBase} ${styles.blueButton}`}
            aria-label={t("community.login") || "Login to your account"}
          >
            {t("community.login") || "Login"}
          </button>
        </nav>
      </HeaderWrapper>
    );
  }

  // Logged in
  return (
    <HeaderWrapper headerRef={dropdownRef} onKeyDown={handleKeyDown} ariaLabel={headerAriaLabel}>
      <nav className="flex items-center gap-3" aria-label={t("nav.main") || "Main navigation"}>
        <HomeButton />
        <button
          ref={triggerRef}
          onClick={() => setShowDropdown(!showDropdown)}
          className={`flex items-center gap-2.5 py-1.5 pl-2 pr-3.5 rounded-3xl
            border border-cyan-400/20 backdrop-blur-xl
            shadow-[0_2px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.05)]
            cursor-pointer transition-all duration-200 hover:border-cyan-400/40
            focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
            ${showDropdown
              ? "bg-gradient-to-br from-cyan-400/20 to-blue-400/20"
              : "bg-gradient-to-br from-cyan-400/[0.12] to-blue-400/[0.12] hover:from-cyan-400/20 hover:to-blue-400/20"
            }`}
          aria-expanded={showDropdown}
          aria-haspopup="true"
          aria-controls="user-menu"
          aria-label={t("nav.userMenu") || `User menu for ${name}`}
        >
          <div
            className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 via-violet-400 to-green-400
              flex items-center justify-center text-[13px] font-bold text-white uppercase
              shadow-[0_2px_8px_rgba(99,210,255,0.3)]"
            aria-hidden="true"
          >
            {name?.charAt(0) || "U"}
          </div>
          <span className="text-sm font-medium whitespace-nowrap tracking-[0.01em]
            bg-gradient-to-br from-white to-blue-200 bg-clip-text text-transparent">
            {name}
          </span>
          <div
            className="w-2 h-2 rounded-full bg-gradient-to-br from-green-500 to-green-400
              shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"
            aria-label={t("status.online") || "Online"}
            role="status"
          />
        </button>
      </nav>

      <CreditDisplay />

      {showDropdown && (
        <div
          id="user-menu"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-menu-button"
          className="absolute top-[calc(100%+8px)] right-0 min-w-[160px]
            bg-slate-900/95 backdrop-blur-xl border border-blue-400/20
            rounded-2xl p-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)]
            z-[1000] flex flex-col gap-1"
        >
          {menuItems.map((item, index) => (
            <DropdownMenuItem
              key={item.id}
              index={index}
              focusedIndex={focusedIndex}
              item={item}
              menuItemsRef={menuItemsRef}
            />
          ))}
        </div>
      )}
    </HeaderWrapper>
  );
}

// ============================================
// Skeleton Component
// ============================================
function GlobalHeaderSkeleton() {
  return (
    <header
      className={styles.header}
      role="banner"
      aria-busy="true"
      aria-label="Loading header"
    >
      <div
        className="min-w-[80px] h-[34px] rounded-[20px] bg-blue-400/10 border border-transparent px-3.5 py-1.5 animate-pulse"
        aria-hidden="true"
      />
    </header>
  );
}

// ============================================
// Export
// ============================================
export default function GlobalHeader() {
  return (
    <Suspense fallback={<GlobalHeaderSkeleton />}>
      <GlobalHeaderContent />
    </Suspense>
  );
}
