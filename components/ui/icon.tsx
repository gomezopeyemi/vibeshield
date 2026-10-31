import {
  Activity, AlertOctagon, AlertTriangle, ArrowRight, ArrowUpRight, AudioLines,
  Ban, Beaker, Bell, Bot, BookLock, Boxes, Braces, Bug, Check, CheckCheck,
  CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, Circle,
  CircleAlert, CircleCheck, CircleDollarSign, CirclePlay, Clipboard, ClipboardCheck,
  Clock, Code2, Command, Copy, CornerDownLeft, Cpu, CreditCard, Database, Dot,
  Download, ExternalLink, Eye, EyeOff, FileCode, FileLock2, FileText, FileWarning,
  Fingerprint, FlaskConical, Flame, Folder, Gauge, Gavel, GitBranch, GitCommitHorizontal,
  GitMerge, GitPullRequest, Globe, Hash, Heart, Inbox, Info, KeyRound, Layers,
  LayoutDashboard, Link2, ListChecks, Loader2, Lock, LogOut, Mail, Menu, MonitorPlay,
  MoreHorizontal, MousePointer2, Network, PackageX, PanelLeft, PanelLeftClose, Play, Plug, PlugZap,
  Plus, Radar, Radio, RefreshCw, Rocket, RotateCw, ScanLine, Scale, Search, Server,
  Settings, Shield, ShieldAlert, ShieldCheck, ShieldQuestion, ShieldX, Siren, Sparkles,
  Square, Table2, Terminal, Timer, Triangle, TrendingDown, TrendingUp, Unlock, User,
  Wallet, Webhook, Wifi, WifiOff, Wind, Workflow, Wrench, X, XCircle, Zap,
  type LucideProps,
} from "lucide-react";

const ICONS = {
  Activity, AlertOctagon, AlertTriangle, ArrowRight, ArrowUpRight, AudioLines,
  Ban, Beaker, Bell, Bot, BookLock, Boxes, Braces, Bug, Check, CheckCheck,
  CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, Circle,
  CircleAlert, CircleCheck, CircleDollarSign, CirclePlay, Clipboard, ClipboardCheck,
  Clock, Code2, Command, Copy, CornerDownLeft, Cpu, CreditCard, Database, Dot,
  Download, ExternalLink, Eye, EyeOff, FileCode, FileLock2, FileText, FileWarning,
  Fingerprint, FlaskConical, Flame, Folder, Gauge, Gavel, GitBranch, GitCommitHorizontal,
  GitMerge, GitPullRequest, Globe, Hash, Heart, Inbox, Info, KeyRound, Layers,
  LayoutDashboard, Link2, ListChecks, Loader2, Lock, LogOut, Mail, Menu, MonitorPlay,
  MoreHorizontal, MousePointer2, Network, PackageX, PanelLeft, PanelLeftClose, Play, Plug, PlugZap,
  Plus, Radar, Radio, RefreshCw, Rocket, RotateCw, ScanLine, Scale, Search, Server,
  Settings, Shield, ShieldAlert, ShieldCheck, ShieldQuestion, ShieldX, Siren, Sparkles,
  Square, Table2, Terminal, Timer, Triangle, TrendingDown, TrendingUp, Unlock, User,
  Wallet, Webhook, Wifi, WifiOff, Wind, Workflow, Wrench, X, XCircle, Zap,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  ...props
}: { name: IconName } & LucideProps) {
  const Cmp = ICONS[name] ?? ICONS.Circle;
  return <Cmp {...props} />;
}

export function hasIcon(name: string): name is IconName {
  return name in ICONS;
}
