import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BME Question Champion",
  description: "The ultimate competition and assessment platform",
};

type Props = {
  children: React.ReactNode;
};

const RootLayout = ({ children }: Props) => {
  return (
    <html lang="en" dir="ltr">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-50 font-sans">
        {children}
      </body>
    </html>
  );
};

export default RootLayout;
