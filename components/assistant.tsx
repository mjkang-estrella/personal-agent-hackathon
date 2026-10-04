"use client";
import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
  type ToolCallMessagePartProps,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";
import {
  ArrowUp,
  Sparkles,
  Square,
  PanelRightClose,
  Eye,
  LoaderCircle,
  Search,
  CircleAlert,
} from "lucide-react";
import { createContext, useContext, useEffect, useRef } from "react";
import type { WorkspaceFocus } from "@/lib/focus";

const FocusContext = createContext<{
  apply: (focus: WorkspaceFocus) => void;
  applied: Set<string>;
}>({ apply: () => {}, applied: new Set() });

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
const isFocus = (r: unknown): r is { focus: WorkspaceFocus } =>
  !!r && typeof r === "object" && "focus" in r;
const viewNames: Record<WorkspaceFocus["view"], string> = {
  plan: "Your plan",
  task: "Task on your plan",
  document: "Document",
  message: "Email",
  inbox: "Inbox",
  activity: "Agent activity",
};
// Tool results are rendered in the thread; a focus result also moves the
// workspace beside the chat, once per call.
function ToolPart({ toolCallId, result, isError }: ToolCallMessagePartProps) {
  const { apply, applied } = useContext(FocusContext);
  const focus = isFocus(result) ? result.focus : undefined;
  useEffect(() => {
    if (!focus || applied.has(toolCallId)) return;
    applied.add(toolCallId);
    apply(focus);
  }, [focus, toolCallId, apply, applied]);
  if (result === undefined)
    return (
      <span className="chat-tool">
        <LoaderCircle size={13} className="spin" /> Looking through your
        workspace…
      </span>
    );
  if (!focus)
    return isError ? null : (
      <span className="chat-tool">
        <Search size={13} /> Checked your workspace
      </span>
    );
  return (
    <button className="chat-tool chat-focus" onClick={() => apply(focus)}>
      <Eye size={13} />
      <span>
        <small>{viewNames[focus.view]}</small>
        {focus.label}
      </span>
    </button>
  );
}
function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="chat-message assistant-message">
      <span className="chat-avatar">
        <Sparkles size={14} />
      </span>
      <div>
        <MessagePrimitive.Parts
          components={{ Text: MarkdownText, tools: { Fallback: ToolPart } }}
        />
        <MessagePrimitive.Error>
          <p className="chat-error" role="alert">
            <CircleAlert size={13} /> I couldn&apos;t finish that answer. Please
            try again.
          </p>
        </MessagePrimitive.Error>
      </div>
    </MessagePrimitive.Root>
  );
}
export default function Assistant({
  open,
  close,
  onFocus,
}: {
  open: boolean;
  close: () => void;
  onFocus: (focus: WorkspaceFocus) => void;
}) {
  const runtime = useChatRuntime({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const applied = useRef(new Set<string>()).current;
  const onFocusRef = useRef(onFocus);
  useEffect(() => {
    onFocusRef.current = onFocus;
  }, [onFocus]);
  const apply = useRef((f: WorkspaceFocus) => onFocusRef.current(f)).current;
  return (
    <aside
      className="assistant-dock"
      aria-label="JobSwitch assistant"
      hidden={!open}
    >
      <header>
        <div className="assistant-heading">
          <span className="icon-bubble peach">
            <Sparkles size={19} />
          </span>
          <div>
            <strong>Your transition assistant</strong>
            <small>Ask, and your workspace follows along.</small>
          </div>
        </div>
        <button
          className="icon-button"
          onClick={close}
          aria-label="Hide assistant"
        >
          <PanelRightClose size={20} />
        </button>
      </header>
      <FocusContext.Provider value={{ apply, applied }}>
        <AssistantRuntimeProvider runtime={runtime}>
          <ThreadPrimitive.Root className="chat-thread">
            <ThreadPrimitive.Viewport className="chat-viewport">
              <ThreadPrimitive.Empty>
                <div className="chat-welcome">
                  <Sparkles size={30} />
                  <h3>How can I help?</h3>
                  <p>
                    Ask about your documents, emails, or deadlines. What you ask
                    about opens in your workspace.
                  </p>
                  <ThreadPrimitive.Suggestion
                    prompt="What should I prioritize before my last day?"
                    autoSend
                    className="suggestion"
                  >
                    What should I prioritize? <ArrowUp size={14} />
                  </ThreadPrimitive.Suggestion>
                  <ThreadPrimitive.Suggestion
                    prompt="Show me the most recent email from HR."
                    autoSend
                    className="suggestion"
                  >
                    Show me the latest HR email <ArrowUp size={14} />
                  </ThreadPrimitive.Suggestion>
                  <ThreadPrimitive.Suggestion
                    prompt="Show me what my documents say about my 401(k) options."
                    autoSend
                    className="suggestion"
                  >
                    What are my 401(k) options? <ArrowUp size={14} />
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
      </FocusContext.Provider>
    </aside>
  );
}
