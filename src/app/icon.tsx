import {compassIcon} from "@/lib/brand-images";

export const size = {width: 192, height: 192};
export const contentType = "image/png";

export default function Icon() {
  return compassIcon(size.width);
}
