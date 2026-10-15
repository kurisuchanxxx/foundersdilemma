import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Atom, Award, BadgeCheck, Banknote, BarChart3, Bike, Bot, Box, BookOpen,
  BrainCircuit, Briefcase, Bug, Building2, CalendarClock, Camera, Car, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleDollarSign, CircleHelp,
  Eraser, Gift, HeartHandshake, ImagePlus, PartyPopper, Shuffle,
  ClipboardList, Clock, Cloud, Code2, Coins, Compass, Cpu, CreditCard, Crosshair, Crown, Dna, Download, Eye, EyeOff, FastForward,
  Feather, FileSpreadsheet, FileText, Flag, Flame, FolderOpen, Gauge, Gem, Globe, GraduationCap, HandCoins, Handshake, Hammer,
  Heart, HeartPulse, Hexagon, Hourglass, Info, KeyRound, Landmark, Languages, Layers, LayoutDashboard, Leaf, Lightbulb, LineChart, ListChecks,
  Lock, LogOut, Medal, Megaphone, MessageCircle, MessagesSquare, Mic, Minus, MonitorPlay, Moon, Mountain, Newspaper, Package,
  Palette, Pencil, Phone, PieChart, PiggyBank, Plane, Play, Plus, Presentation, Printer, Puzzle, Radio, RefreshCcw, Rocket, RotateCcw, Save, Scale,
  School, Search, Settings, Settings2, ShieldCheck, ShoppingBag, ShoppingCart, SlidersHorizontal, Smartphone, Sparkles, Star,
  Stethoscope, Store, Sun, Sunrise, Swords, Target, Terminal, Timer, Trash2, TrendingDown, TrendingUp, Trophy, Unlock, Upload,
  UserMinus, UserPlus, UserRound, Users, UsersRound, Video, Wallet, Wrench, X, Zap,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Atom, Award, BadgeCheck, Banknote, BarChart3, Bike, Bot, Box, BookOpen,
  BrainCircuit, Briefcase, Bug, Building2, CalendarClock, Camera, Car, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleDollarSign, CircleHelp,
  Eraser, Gift, HeartHandshake, ImagePlus, PartyPopper, Shuffle,
  ClipboardList, Clock, Cloud, Code2, Coins, Compass, Cpu, CreditCard, Crosshair, Crown, Dna, Download, Eye, EyeOff, FastForward,
  Feather, FileSpreadsheet, FileText, Flag, Flame, FolderOpen, Gauge, Gem, Globe, GraduationCap, HandCoins, Handshake, Hammer,
  Heart, HeartPulse, Hexagon, Hourglass, Info, KeyRound, Landmark, Languages, Layers, LayoutDashboard, Leaf, Lightbulb, LineChart, ListChecks,
  Lock, LogOut, Medal, Megaphone, MessageCircle, MessagesSquare, Mic, Minus, MonitorPlay, Moon, Mountain, Newspaper, Package,
  Palette, Pencil, Phone, PieChart, PiggyBank, Plane, Play, Plus, Presentation, Printer, Puzzle, Radio, RefreshCcw, Rocket, RotateCcw, Save, Scale,
  School, Search, Settings, Settings2, ShieldCheck, ShoppingBag, ShoppingCart, SlidersHorizontal, Smartphone, Sparkles, Star,
  Stethoscope, Store, Sun, Sunrise, Swords, Target, Terminal, Timer, Trash2, TrendingDown, TrendingUp, Trophy, Unlock, Upload,
  UserMinus, UserPlus, UserRound, Users, UsersRound, Video, Wallet, Wrench, X, Zap,
};

export function Icon({ name, size = 16, className, strokeWidth }: { name: string; size?: number; className?: string; strokeWidth?: number }) {
  const C = ICONS[name] ?? Sparkles;
  return <C size={size} className={className} strokeWidth={strokeWidth ?? 2} aria-hidden="true" />;
}

export function hasIcon(name: string): boolean {
  return name in ICONS;
}
