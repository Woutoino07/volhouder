import {
  Dumbbell, Phone, BookOpen, LineChart, Droplet, Moon, PenTool,
  Utensils, Coffee, Laptop, GraduationCap, Wallet, Heart, Music,
  Repeat,
} from "lucide-react";

// Leidt een passend icoon af uit de titel van een commitment — puur
// cosmetisch, geen apart veld in de database nodig.
const RULES = [
  { keywords: ["gym", "sport", "fitness", "hardloop", "run", "training"], icon: Dumbbell },
  { keywords: ["call", "bel", "meeting", "overleg", "afspraak"], icon: Phone },
  { keywords: ["read", "lees", "boek", "book"], icon: BookOpen },
  { keywords: ["backtest", "trading", "invest", "portfolio", "stock", "beurs", "smb"], icon: LineChart },
  { keywords: ["water", "drink"], icon: Droplet },
  { keywords: ["slaap", "sleep", "bed"], icon: Moon },
  { keywords: ["schrijf", "write", "journal", "story", "blog"], icon: PenTool },
  { keywords: ["eten", "food", "maaltijd", "meal", "kook"], icon: Utensils },
  { keywords: ["koffie", "coffee"], icon: Coffee },
  { keywords: ["study", "studie", "leren", "cursus", "bootcamp"], icon: GraduationCap },
  { keywords: ["werk", "project", "review", "portfolio overview"], icon: Laptop },
  { keywords: ["geld", "budget", "spaar", "saving"], icon: Wallet },
  { keywords: ["muziek", "music", "piano", "gitaar"], icon: Music },
  { keywords: ["mediteer", "yoga", "ademhaling"], icon: Heart },
];

export function inferIcon(title) {
  const t = (title || "").toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => t.includes(k))) return rule.icon;
  }
  return Repeat;
}
