import mindoLogo from "../assets/minddo logo.png";

export default function BrandWordmark({ compact = false, className = "", imgClassName = "", showTagline = true }) {
  const defaultImgClass = compact
    ? "h-auto w-[190px] sm:w-[240px]"
    : "h-auto w-[520px] sm:w-[650px] md:w-[760px] lg:w-[900px]";

  return (
    <div className={className}>
      <img
        src={mindoLogo}
        alt="Mindo logo"
        className={imgClassName || defaultImgClass}
        style={{ display: "block", maxWidth: "100%" }}
      />
      {showTagline && (
        <div className="sr-only">Everything on your mind</div>
      )}
    </div>
  );
}
