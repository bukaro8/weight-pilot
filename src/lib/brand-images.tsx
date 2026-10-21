import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {ImageResponse} from "next/og";

async function logoDataUrl() {
  const logo = await readFile(join(process.cwd(), "src/assets/images/WeightPilot Compass Logo.png"));
  return `data:image/png;base64,${logo.toString("base64")}`;
}

export async function compassIcon(size: number) {
  const logo = await logoDataUrl();
  return new ImageResponse(
    <div style={{position: "relative", display: "flex", width: "100%", height: "100%", overflow: "hidden", background: "#FBF8F5"}}>
      {/* The square frame crops the compass from the existing horizontal wordmark. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt="" style={{position: "absolute", width: size * 4.24, height: size * 1.414, left: -size * 0.05, top: -size * 0.1}}/>
    </div>,
    {width: size, height: size},
  );
}

export async function socialImage(description: string) {
  const logo = await logoDataUrl();
  return new ImageResponse(
    <div style={{display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#FBF8F5", color: "#1E3A5F", padding: "70px 82px"}}>
      <div style={{display: "flex", width: "100%", height: 10, background: "#E9C9C0", borderRadius: 8}}/>
      <div style={{display: "flex", alignItems: "center", flex: 1}}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="WeightPilot" style={{width: 920, height: 307, objectFit: "contain"}}/>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: 22}}>
        <div style={{display: "flex", width: 84, height: 6, background: "#D4A094", borderRadius: 6}}/>
        <div style={{display: "flex", maxWidth: 980, fontSize: 39, fontWeight: 600, lineHeight: 1.25}}>{description}</div>
      </div>
    </div>,
    {width: 1200, height: 630},
  );
}
