import Link from "next/link";

export default function CaseNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <h1 className="text-2xl font-extrabold text-leaf-950">Case not found</h1>
      <p className="text-ui text-leaf-950/80">This case does not exist, or you do not have access to it.</p>
      <Link href="/" className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-ui font-semibold text-primary-foreground">
        Go home
      </Link>
    </div>
  );
}
