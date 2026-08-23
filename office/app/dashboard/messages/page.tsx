"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MentorChatPanel, type ChatTarget } from "@/components/MentorChatPanel";

function MessagesInner() {
  const params = useSearchParams();
  const learner = params.get("learner");
  const chat = params.get("chat");
  let initialChat: ChatTarget | undefined;
  if (chat === "common") initialChat = "common";
  else if (learner) initialChat = learner;

  return <MentorChatPanel initialChat={initialChat} />;
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="page wide"><p className="hint">Loading messages…</p></div>}>
      <MessagesInner />
    </Suspense>
  );
}
