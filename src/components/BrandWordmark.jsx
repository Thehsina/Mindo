import mindoLogo from "../assets/Mindo logo.png";

export default function BrandWordmark({ compact = false, className = "", showTagline = true }) {
  return (
    <div className={className}>
      <img
        src={mindoLogo}
        alt="Mindo logo"
        className={compact ? "h-auto w-[190px] sm:w-[240px]" : "h-auto w-[520px] sm:w-[650px] md:w-[760px] lg:w-[900px]"}
        style={{ display: "block", maxWidth: "100%" }}
      />
      {showTagline && (
        <div className="sr-only">Everything on your mind</div>
      )}
    </div>
  );
}
