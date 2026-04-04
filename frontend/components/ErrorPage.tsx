import Link from "next/link";

interface Props {
  username: string;
  errorCode: string;
  retryAfterSecs?: number;
}

function resolveError(
  username: string,
  errorCode: string,
  retryAfterSecs?: number
): { title: string; message: string; httpCode?: string } {
  switch (errorCode) {
    case "GITHUB_USER_NOT_FOUND":
      return {
        title: "User not found",
        message: `We couldn't find @${username} on GitHub. Check the spelling and try again.`,
        httpCode: "404",
      };
    case "GITHUB_RATE_LIMIT": {
      const mins = retryAfterSecs
        ? Math.ceil(retryAfterSecs / 60)
        : "a few";
      return {
        title: "GitHub rate limit hit",
        message: `GitHub's rate limit is hit. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
        httpCode: "429",
      };
    }
    case "GITHUB_UNAVAILABLE":
      return {
        title: "GitHub is unreachable",
        message:
          "GitHub is temporarily unreachable. Try again in a moment.",
        httpCode: "502",
      };
    case "INVALID_USERNAME":
      return {
        title: "Invalid username",
        message: `"${username}" isn't a valid GitHub username. Check the spelling and try again.`,
        httpCode: "422",
      };
    default:
      return {
        title: "Something went wrong",
        message: "An unexpected error occurred. Please try again.",
      };
  }
}

export function ErrorPage({ username, errorCode, retryAfterSecs }: Props) {
  const { title, message, httpCode } = resolveError(
    username,
    errorCode,
    retryAfterSecs
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center animate-fade-in">
      {httpCode && (
        <div
          className="font-display font-bold leading-none text-graphite mb-4 select-none"
          style={{ fontSize: "clamp(64px, 12vw, 96px)" }}
          aria-hidden="true"
        >
          {httpCode}
        </div>
      )}
      <h1 className="font-display font-bold text-snow text-2xl mb-3">
        {title}
      </h1>
      <p className="font-body text-ash text-base max-w-sm mb-8">{message}</p>
      <Link
        href="/"
        className="rounded-lg border border-graphite px-5 py-2.5 font-body font-semibold text-sm text-snow hover:border-primary hover:text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:border-primary"
      >
        ← Try another username
      </Link>
    </div>
  );
}
