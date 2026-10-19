import Image from "next/image";
import logo from "@/assets/images/WeightPilot Compass Logo.png";
import {cn} from "@/lib/utils";

export function BrandLogo({className, priority = false}: {className?: string; priority?: boolean}) {
  return <Image src={logo} alt="WeightPilot" priority={priority} loading="eager" className={cn("h-auto w-auto object-contain", className)} sizes="(max-width: 767px) 132px, 164px"/>;
}
