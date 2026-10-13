import mindoLogo from "../assets/minddo logo.png";

export default function BrandWordmark({ compact = false, className = "", imgClassName = "", showTagline = true }) {
  const defaultImgClass = compact
    ? "h-auto w-[180px] sm:w-[220px] mx-auto object-contain"
    : "h-auto w-[520px] sm:w-[650px] md:w-[760px] lg:w-[900px] mx-auto object-contain";

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <img
        src={mindoLogo}
        alt="Minddo logo"
        className={imgClassName || defaultImgClass}
        style={{ display: "block", maxWidth: "100%" }}
      />
      {showTagline && (
        <div className="sr-only">Everything on your mind</div>
      )}
    </div>
  );
}
