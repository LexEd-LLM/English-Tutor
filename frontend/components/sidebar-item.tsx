"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

type SidebarItemProps = {
  label: string;
  iconSrc: string;
  href: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

export const SidebarItem = ({ label, iconSrc, href, onClick }: SidebarItemProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  if (onClick) {
    // Nếu có onClick thì không dùng Link
    return (
      <Button
        variant="sidebar"
        className="h-[52px] justify-start"
        onClick={onClick}
      >
        <Image src={iconSrc} alt={label} className="mr-5" height={32} width={32} />
        {label}
      </Button>
    );
  }

  // Nếu không có onClick thì dùng Link
  return (
    <Button
      variant={isActive ? "sidebarOutline" : "sidebar"}
      className="h-[52px] justify-start"
      asChild
    >
      <Link href={href}>
        <Image src={iconSrc} alt={label} className="mr-5" height={32} width={32} />
        {label}
      </Link>
    </Button>
  );
};
