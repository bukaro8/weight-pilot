"use client";

import {Eye, EyeOff} from "lucide-react";
import {useState, type InputHTMLAttributes} from "react";
import {useTranslations} from "next-intl";

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  const t = useTranslations("auth");
  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`${props.className ?? ""} pr-12`}/>
      <button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? t("hidePassword") : t("showPassword")} aria-pressed={visible} className="absolute inset-y-0 right-0 flex min-h-11 w-12 items-center justify-center rounded-r-xl text-muted transition-colors hover:text-primary focus-visible:outline-offset-[-3px]">
        {visible ? <EyeOff aria-hidden="true" size={19}/> : <Eye aria-hidden="true" size={19}/>} 
      </button>
    </div>
  );
}
