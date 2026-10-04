"use client";
import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";
import { ArrowUp, Sparkles, X, Square } from "lucide-react";
function MarkdownText({ text }: { text: string }) {
  return <ReactMarkdown>{text}</ReactMarkdown>;
}
function UserMessage() {
  return (
    <MessagePrimitive.Root className="chat-message user-message">
      <MessagePrimitive.Parts />
    </MessagePrimitive.Root>
  );
}
function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="chat-message assistant-message">
      <span className="chat-avatar">
        <Sparkles size={14} />
      </span>
      <div>
        <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
        <MessagePrimitive.Error />
      </div>
    </MessagePrimitive.Root>
  );
}
export default function Assistant({ close }: { close: () => void }) {
  const runtime = useChatRuntime({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  return (
    <aside className="assistant-panel" aria-label="JobSwitch assistant">
      <header>
        <div className="assistant-heading">
          <span className="icon-bubble peach">
            <Sparkles size={19} />
          </span>
          <div>
            <strong>Your transition assistant</strong>
            <small>Here to connect the dots.</small>
          </div>
        </div>
        <button
          className="icon-button"
          onClick={close}
          aria-label="Close assistant"
        >
          <X size={20} />
        </button>
      </header>
      <AssistantRuntimeProvider runtime={runtime}>
        <ThreadPrimitive.Root className="chat-thread">
          <ThreadPrimitive.Viewport className="chat-viewport">
            <ThreadPrimitive.Empty>
              <div className="chat-welcome">
                <Sparkles size={30} />
                <h3>A little clarity goes a long way.</h3>
                <p>
                  Ask about your documents, upcoming deadlines, or what to
                  handle next.
                </p>
                <ThreadPrimitive.Suggestion
                  prompt="What should I prioritize before my last day?"
                  autoSend
                  className="suggestion"
                >
                  What should I prioritize? <ArrowUp size={14} />
                </ThreadPrimitive.Suggestion>
                <ThreadPrimitive.Suggestion
                  prompt="Explain the possible health coverage gap using my documents."
                  autoSend
                  className="suggestion"
                >
                  Help me understand my coverage <ArrowUp size={14} />
                </ThreadPrimitive.Suggestion>
              </div>
            </ThreadPrimitive.Empty>
            <ThreadPrimitive.Messages
              components={{ UserMessage, AssistantMessage }}
            />
          </ThreadPrimitive.Viewport>
          <ComposerPrimitive.Root className="chat-composer">
            <ComposerPrimitive.Input
              placeholder="Ask anything about your transition…"
              aria-label="Message your assistant"
            />
            <ThreadPrimitive.If running={false}>
              <ComposerPrimitive.Send
                className="send-button"
                aria-label="Send message"
              >
                <ArrowUp size={19} />
              </ComposerPrimitive.Send>
            </ThreadPrimitive.If>
            <ThreadPrimitive.If running>
              <ComposerPrimitive.Cancel
                className="send-button"
                aria-label="Stop response"
              >
                <Square size={14} />
              </ComposerPrimitive.Cancel>
            </ThreadPrimitive.If>
          </ComposerPrimitive.Root>
          <p className="chat-note">
            Grounded in your documents. Decisions stay with you.
          </p>
        </ThreadPrimitive.Root>
      </AssistantRuntimeProvider>
    </aside>
  );
}
