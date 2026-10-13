import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "#/features/auth";
import { ChatShell } from "#/features/chat/components/chat-shell";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <AuthGate>
      <ChatShell />
    </AuthGate>
  );
}
