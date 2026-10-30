import { DslnLogo } from "./DslnLogo";

interface PaperclipLockupProps {
  decorative?: boolean;
  title?: string;
  className?: string;
}

export function PaperclipLockup({
  title = "DSLN Capital",
  className,
}: PaperclipLockupProps) {
  return (
    <DslnLogo
      className="size-8"
      showText
      textClassName="ml-1"
      subtitle="Autonomous Agent Control Plane"
    />
  );
}
