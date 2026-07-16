import type { ElementType } from "react";
import {
  LayoutDashboard,
  Users,
  ClipboardPlus,
  BedDouble,
  Users2,
  Pill,
  FileText,
  FlaskConical,
  ShoppingCart,
  Stethoscope,
  Package,
  PackagePlus,
  PackageMinus,
  Truck,
  Tags,
  LayoutGrid,
  Wallet,
  BarChart2,
  Settings,
  Shield,
  IndianRupee,
  Tablets,
  CreditCard,
  Printer,
  Bell,
  CalendarDays,
  Banknote,
  TreePalm,
  History,
} from "lucide-react";

export interface NavChild {
  href: string;
  label: string;
  icon: ElementType;
  /** Module permission key — if omitted, always visible */
  moduleKey?: string;
}

export interface NavItem {
  href: string;
  key: string;
  icon: ElementType;
  /** Module permission key — if omitted, always visible */
  moduleKey?: string;
  children?: NavChild[];
}

/** Sidebar nav structure — also the source of truth the Topbar page title is derived from. */
export const navItems: NavItem[] = [
  {
    href: "/",
    key: "dashboard",
    icon: LayoutDashboard,
    moduleKey: "dashboard",
  },
  {
    href: "/patients",
    key: "patients",
    icon: Users,
    moduleKey: "patients",
  },
  { href: "/opd", key: "opd", icon: ClipboardPlus, moduleKey: "opd" },
  { href: "/ipd", key: "ipd", icon: BedDouble, moduleKey: "ipd" },
  {
    href: "/hr",
    key: "hr",
    icon: Users2,
    moduleKey: "humanResource",
    children: [
      {
        href: "/hr",
        label: "Staff Directory",
        icon: Users2,
        moduleKey: "humanResource",
      },
      {
        href: "/hr/attendance",
        label: "Attendance",
        icon: CalendarDays,
        moduleKey: "humanResource",
      },
      {
        href: "/hr/payroll",
        label: "Payroll",
        icon: Banknote,
        moduleKey: "humanResource",
      },
      {
        href: "/hr/leaves",
        label: "Leaves",
        icon: TreePalm,
        moduleKey: "humanResource",
      },
    ],
  },
  {
    href: "/pharmacy",
    key: "pharmacy",
    icon: Pill,
    moduleKey: "pharmacy",
    children: [
      {
        href: "/pharmacy",
        label: "Bills",
        icon: FileText,
        moduleKey: "pharmacy",
      },
      {
        href: "/pharmacy/medicines",
        label: "Medicines",
        icon: FlaskConical,
        moduleKey: "pharmacy",
      },
      {
        href: "/pharmacy/purchases",
        label: "Purchase Medicine",
        icon: ShoppingCart,
        moduleKey: "pharmacy",
      },
    ],
  },
  {
    href: "/pathology",
    key: "pathology",
    icon: FlaskConical,
    moduleKey: "pathology",
    children: [
      {
        href: "/pathology",
        label: "Bills",
        icon: FileText,
        moduleKey: "pathology",
      },
      {
        href: "/pathology/tests",
        label: "Pathology Test",
        icon: FlaskConical,
        moduleKey: "pathology",
      },
    ],
  },
  {
    href: "/radiology",
    key: "radiology",
    icon: Stethoscope,
    moduleKey: "radiology",
    children: [
      {
        href: "/radiology",
        label: "Bills",
        icon: FileText,
        moduleKey: "radiology",
      },
      {
        href: "/radiology/tests",
        label: "Radiology Test",
        icon: Stethoscope,
        moduleKey: "radiology",
      },
    ],
  },
  {
    href: "/inventory",
    key: "inventory",
    icon: Package,
    moduleKey: "inventory",
    children: [
      {
        href: "/inventory",
        label: "Overview",
        icon: LayoutGrid,
        moduleKey: "inventory",
      },
      {
        href: "/inventory/items",
        label: "Items",
        icon: Package,
        moduleKey: "inventory",
      },
      {
        href: "/inventory/purchases",
        label: "Purchases (Stock In)",
        icon: PackagePlus,
        moduleKey: "inventory",
      },
      {
        href: "/inventory/issues",
        label: "Issues (Stock Out)",
        icon: PackageMinus,
        moduleKey: "inventory",
      },
      {
        href: "/inventory/vendors",
        label: "Vendors",
        icon: Truck,
        moduleKey: "inventory",
      },
      {
        href: "/inventory/categories",
        label: "Categories",
        icon: Tags,
        moduleKey: "inventory",
      },
    ],
  },
  {
    href: "/billing",
    key: "billing",
    icon: Wallet,
    moduleKey: "billing",
  },
  {
    href: "/tpa",
    key: "tpa",
    icon: Shield,
    moduleKey: "tpa",
    children: [
      {
        href: "/tpa",
        label: "Claims",
        icon: FileText,
        moduleKey: "tpa",
      },
      {
        href: "/tpa/settlements",
        label: "Settlements",
        icon: Wallet,
        moduleKey: "tpa",
      },
    ],
  },
  {
    href: "/reports",
    key: "reports",
    icon: BarChart2,
    moduleKey: "reports",
  },
  {
    href: "/settings",
    key: "settings",
    icon: Settings,
    moduleKey: "settings",
    children: [
      // Organization
      { href: "/settings", label: "General", icon: Settings },
      // People & access
      { href: "/settings/roles", label: "Roles", icon: Shield },
      {
        href: "/settings/departments",
        label: "Departments",
        icon: Users2,
      },
      {
        href: "/settings/user-logs",
        label: "User Logs",
        icon: History,
      },
      // Hospital setup
      {
        href: "/settings/services",
        label: "Services",
        icon: IndianRupee,
      },
      {
        href: "/settings/bed-setup",
        label: "Bed Setup",
        icon: BedDouble,
      },
      {
        href: "/settings/pharmacy",
        label: "Pharmacy",
        icon: Tablets,
      },
      // Insurance & TPA
      {
        href: "/settings/tpa",
        label: "TPA Companies",
        icon: Shield,
      },
      // Billing & output
      {
        href: "/settings/billing",
        label: "Billing",
        icon: CreditCard,
      },
      {
        href: "/settings/print-layouts",
        label: "Print Layouts",
        icon: Printer,
      },
      {
        href: "/settings/notifications",
        label: "Notifications",
        icon: Bell,
      },
    ],
  },
];

interface NavTitleEntry {
  href: string;
  /** Translation key under the "nav" i18n namespace — used for top-level items. */
  navKey?: string;
  /** Literal label — used for children, which aren't localized today. */
  label?: string;
  /** Set on child entries so the Topbar breadcrumb can render "Parent / Child". */
  parent?: { navKey: string; href: string };
}

const titleEntries: NavTitleEntry[] = navItems
  .flatMap((item): NavTitleEntry[] =>
    item.children
      ? item.children.map((c) => ({
          href: c.href,
          label: c.label,
          parent: { navKey: item.key, href: item.href },
        }))
      : [{ href: item.href, navKey: item.key }],
  )
  .sort((a, b) => b.href.length - a.href.length);

/** Best-matching nav entry for a pathname, used to derive the Topbar page title. */
export function matchNavEntry(pathname: string): NavTitleEntry | undefined {
  return titleEntries.find((e) =>
    e.href === "/"
      ? pathname === "/"
      : pathname === e.href || pathname.startsWith(`${e.href}/`),
  );
}
