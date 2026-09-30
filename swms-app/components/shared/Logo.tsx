import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** The SWMS logo exactly as supplied (public/brand/logo.png, transparent PNG). */
export function Logo({
  className,
  preload = false,
  href = "/",
}: {
  className?: string;
  preload?: boolean;
  href?: string;
}) {
  return (
    <Link href={href} aria-label="SWMS — Smart Waste Management System, home" className="inline-flex shrink-0">
      <Image
        src="/brand/logo.png"
        alt="SWMS — Smart Waste Management System"
        width={1916}
        height={821}
        preload={preload}
        sizes="(min-width: 1024px) 180px, 140px"
        className={cn("h-auto w-[140px] lg:w-[180px]", className)}
      />
    </Link>
  );
}
