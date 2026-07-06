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
    <div className="max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-action">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-semibold leading-tight text-ink sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 text-lg leading-8 text-slateblue">{body}</p>
    </div>
  );
}
