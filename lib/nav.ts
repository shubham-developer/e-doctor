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
    href: "/dashboard",
    key: "dashboard",
    icon: LayoutDashboard,
    moduleKey: "dashboard",
  },
  {
    href: "/dashboard/patients",
    key: "patients",
    icon: Users,
    moduleKey: "patients",
  },
  { href: "/dashboard/opd", key: "opd", icon: ClipboardPlus, moduleKey: "opd" },
  { href: "/dashboard/ipd", key: "ipd", icon: BedDouble, moduleKey: "ipd" },
  {
    href: "/dashboard/hr",
    key: "hr",
    icon: Users2,
    moduleKey: "humanResource",
    children: [
      {
        href: "/dashboard/hr",
        label: "Staff Directory",
        icon: Users2,
        moduleKey: "humanResource",
      },
      {
        href: "/dashboard/hr/attendance",
        label: "Attendance",
        icon: CalendarDays,
        moduleKey: "humanResource",
      },
      {
        href: "/dashboard/hr/payroll",
        label: "Payroll",
        icon: Banknote,
        moduleKey: "humanResource",
      },
      {
        href: "/dashboard/hr/leaves",
        label: "Leaves",
        icon: TreePalm,
        moduleKey: "humanResource",
      },
    ],
  },
  {
    href: "/dashboard/pharmacy",
    key: "pharmacy",
    icon: Pill,
    moduleKey: "pharmacy",
    children: [
      {
        href: "/dashboard/pharmacy",
        label: "Bills",
        icon: FileText,
        moduleKey: "pharmacy",
      },
      {
        href: "/dashboard/pharmacy/medicines",
        label: "Medicines",
        icon: FlaskConical,
        moduleKey: "pharmacy",
      },
      {
        href: "/dashboard/pharmacy/purchases",
        label: "Purchase Medicine",
        icon: ShoppingCart,
        moduleKey: "pharmacy",
      },
    ],
  },
  {
    href: "/dashboard/pathology",
    key: "pathology",
    icon: FlaskConical,
    moduleKey: "pathology",
    children: [
      {
        href: "/dashboard/pathology",
        label: "Bills",
        icon: FileText,
        moduleKey: "pathology",
      },
      {
        href: "/dashboard/pathology/tests",
        label: "Pathology Test",
        icon: FlaskConical,
        moduleKey: "pathology",
      },
    ],
  },
  {
    href: "/dashboard/radiology",
    key: "radiology",
    icon: Stethoscope,
    moduleKey: "radiology",
    children: [
      {
        href: "/dashboard/radiology",
        label: "Bills",
        icon: FileText,
        moduleKey: "radiology",
      },
      {
        href: "/dashboard/radiology/tests",
        label: "Radiology Test",
        icon: Stethoscope,
        moduleKey: "radiology",
      },
    ],
  },
  {
    href: "/dashboard/inventory",
    key: "inventory",
    icon: Package,
    moduleKey: "inventory",
    children: [
      {
        href: "/dashboard/inventory",
        label: "Overview",
        icon: LayoutGrid,
        moduleKey: "inventory",
      },
      {
        href: "/dashboard/inventory/items",
        label: "Items",
        icon: Package,
        moduleKey: "inventory",
      },
      {
        href: "/dashboard/inventory/purchases",
        label: "Purchases (Stock In)",
        icon: PackagePlus,
        moduleKey: "inventory",
      },
      {
        href: "/dashboard/inventory/issues",
        label: "Issues (Stock Out)",
        icon: PackageMinus,
        moduleKey: "inventory",
      },
      {
        href: "/dashboard/inventory/vendors",
        label: "Vendors",
        icon: Truck,
        moduleKey: "inventory",
      },
      {
        href: "/dashboard/inventory/categories",
        label: "Categories",
        icon: Tags,
        moduleKey: "inventory",
      },
    ],
  },
  {
    href: "/dashboard/billing",
    key: "billing",
    icon: Wallet,
    moduleKey: "billing",
  },
  {
    href: "/dashboard/tpa",
    key: "tpa",
    icon: Shield,
    moduleKey: "tpa",
    children: [
      {
        href: "/dashboard/tpa",
        label: "Claims",
        icon: FileText,
        moduleKey: "tpa",
      },
      {
        href: "/dashboard/tpa/settlements",
        label: "Settlements",
        icon: Wallet,
        moduleKey: "tpa",
      },
    ],
  },
  {
    href: "/dashboard/reports",
    key: "reports",
    icon: BarChart2,
    moduleKey: "reports",
  },
  {
    href: "/dashboard/settings",
    key: "settings",
    icon: Settings,
    moduleKey: "settings",
    children: [
      // Organization
      { href: "/dashboard/settings", label: "General", icon: Settings },
      // People & access
      { href: "/dashboard/settings/roles", label: "Roles", icon: Shield },
      {
        href: "/dashboard/settings/departments",
        label: "Departments",
        icon: Users2,
      },
      // Hospital setup
      {
        href: "/dashboard/settings/services",
        label: "Services",
        icon: IndianRupee,
      },
      {
        href: "/dashboard/settings/bed-setup",
        label: "Bed Setup",
        icon: BedDouble,
      },
      {
        href: "/dashboard/settings/pharmacy",
        label: "Pharmacy",
        icon: Tablets,
      },
      // Insurance & TPA
      {
        href: "/dashboard/settings/tpa",
        label: "TPA Companies",
        icon: Shield,
      },
      // Billing & output
      {
        href: "/dashboard/settings/billing",
        label: "Billing",
        icon: CreditCard,
      },
      {
        href: "/dashboard/settings/print-layouts",
        label: "Print Layouts",
        icon: Printer,
      },
      {
        href: "/dashboard/settings/notifications",
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
    e.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === e.href || pathname.startsWith(`${e.href}/`),
  );
}
