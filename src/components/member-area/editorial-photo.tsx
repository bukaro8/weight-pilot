import Image from "next/image";

import calmMorning from "@/assets/images/Calm Morning At Home.png";
import warmConversation from "@/assets/images/Warm Office Conversation.png";
import {cn} from "@/lib/utils";

type Props = {
  scene: "morning" | "conversation";
  alt: string;
  className?: string;
  priority?: boolean;
};

/** A consistent, softly framed editorial image for private member states. */
export function EditorialPhoto({scene, alt, className, priority = false}: Props) {
  return <div className={cn("relative isolate overflow-hidden rounded-[1.4rem] bg-pale-blush", className)}>
    <Image
      src={scene === "morning" ? calmMorning : warmConversation}
      alt={alt}
      fill
      priority={priority}
      placeholder="blur"
      sizes="(min-width: 1024px) 420px, (min-width: 640px) 45vw, calc(100vw - 48px)"
      className="object-cover object-center"
    />
  </div>;
}
