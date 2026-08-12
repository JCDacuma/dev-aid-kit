import ContextToolNavbar from "@/app/context/toolsNavbar";

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ContextToolNavbar>{children}</ContextToolNavbar>;
}
