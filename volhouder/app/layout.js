// Inter zelf meegeleverd (via @fontsource) in plaats van via next/font/google:
// dat laatste moet bij elke build naar Google Fonts kunnen bellen, wat niet
// overal gegarandeerd is (bv. achter een firewall of build-sandbox zonder
// netwerktoegang). Zelf meeleveren werkt altijd, ook offline.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "./globals.css";

export const metadata = {
  title: "Volhouder",
  description: "Commitments met een echte partner en een echte straf.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#0F1F3D",
};

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
