export function PageIntro({
  eyebrow,
  title,
  body
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-[560px]">
      <p className="mb-2.5 text-[13px] font-bold uppercase tracking-[0.14em] text-brandAmber">
        {eyebrow}
      </p>
      <h1 className="text-[40px] font-extrabold leading-[1.1] tracking-[-0.02em] text-ink">
        {title}
      </h1>
      <p className="mt-4 text-[16.5px] leading-[1.6] text-muted">{body}</p>
    </div>
  );
}
