import Image from "next/image";

/**
 * VR Digitals mark, pulled from vrdigitals.net. The source PNG is white-on-
 * transparent (their site runs on a dark background), so it sits on a dark
 * gradient badge here to stay visible against the portal's light UI.
 */
export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-xl bg-[#0f0a1a] p-1.5 shadow-sm"
      style={{ width: size, height: size }}
    >
      <Image
        src="/vr-logo-icon.png"
        alt="VR Digitals"
        width={size}
        height={size}
        className="h-full w-full object-contain"
        priority
      />
    </div>
  );
}
