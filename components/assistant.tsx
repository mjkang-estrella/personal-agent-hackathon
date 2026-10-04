"use client";
import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
  type ToolCallMessagePartProps,
  useAuiState,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";
import {
  ArrowUp,
  Sparkles,
  Square,
  LayoutDashboard,
  Eye,
  LoaderCircle,
  Search,
  CircleAlert,
  ArrowRight,
  FileText,
  SquarePen,
  ShieldCheck,
  X,
  Maximize2,
} from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Orientation, OrientationAction } from "@/lib/orientation";
import type { WorkspaceFocus } from "@/lib/focus";

const FocusContext = createContext<{
  apply: (focus: WorkspaceFocus, automatic?: boolean) => void;
  applied: Set<string>;
}>({ apply: () => {}, applied: new Set() });

function ConversationViewport({ children }: { children: ReactNode }) {
  const empty = useAuiState((s) => s.thread.isEmpty);
  return (
    <ThreadPrimitive.Viewport
      className="chat-viewport"
      autoScroll={!empty}
      scrollToBottomOnInitialize={false}
      scrollToBottomOnThreadSwitch={false}
    >
      {children}
    </ThreadPrimitive.Viewport>
  );
}

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
// Tool results remain in the conversation. A reference opens its full workspace
// page only when the user clicks it.
function ToolPart({ toolCallId, result, isError }: ToolCallMessagePartProps) {
  const { apply, applied } = useContext(FocusContext);
  const focus = isFocus(result) ? result.focus : undefined;
  useEffect(() => {
    if (!focus || applied.has(toolCallId)) return;
    applied.add(toolCallId);
    apply(focus, true);
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
type AssistantProps = {
  briefing: Orientation;
  transition: string;
  busy: boolean;
  visible: boolean;
  docked: boolean;
  close: () => void;
  expand: () => void;
  openPlan: () => void;
  onAction: (action: OrientationAction) => void;
  onFocus: (focus: WorkspaceFocus, automatic?: boolean) => void;
};
export default function Assistant(props: AssistantProps) {
  const [conversation, setConversation] = useState(0);
  return (
    <AssistantConversation
      key={conversation}
      {...props}
      newChat={() => setConversation((n) => n + 1)}
    />
  );
}
function AssistantConversation({
  briefing,
  transition,
  busy,
  visible,
  docked,
  close,
  expand,
  openPlan,
  onAction,
  onFocus,
  newChat,
}: AssistantProps & { newChat: () => void }) {
  const runtime = useChatRuntime({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const applied = useRef(new Set<string>()).current;
  const onFocusRef = useRef(onFocus);
  useEffect(() => {
    onFocusRef.current = onFocus;
  }, [onFocus]);
  const apply = useRef((f: WorkspaceFocus, automatic?: boolean) =>
    onFocusRef.current(f, automatic),
  ).current;
  return (
    <section
      id="workspace-assistant"
      className={`assistant-primary ${docked ? "assistant-dock" : ""}`}
      onKeyDown={(event) => {
        if (docked && event.key === "Escape") {
          event.stopPropagation();
          close();
        }
      }}
      aria-label="Chat with JobSwitch"
      hidden={!visible}
    >
      <header>
        <span className="conversation-title">
          <Sparkles size={18} /> JobSwitch
        </span>
        <div className="assistant-actions">
          <button
            className="text-button"
            onClick={() => {
              runtime.thread.cancelRun();
              newChat();
              requestAnimationFrame(() =>
                document
                  .querySelector<HTMLTextAreaElement>(
                    '[aria-label="Message your assistant"]',
                  )
                  ?.focus({ preventScroll: true }),
              );
            }}
            aria-label="New chat"
          >
            <SquarePen size={16} /> New chat
          </button>
          {docked ? (
            <>
              <button className="icon-button" aria-label="Open full Chat tab" onClick={expand}>
                <Maximize2 size={17} />
              </button>
              <button className="icon-button" aria-label="Close chat panel" onClick={close}>
                <X size={18} />
              </button>
            </>
          ) : (
            <button className="text-button chat-plan-toggle" onClick={openPlan}>
              <LayoutDashboard size={16} /> Your plan
            </button>
          )}
        </div>
      </header>
      <FocusContext.Provider value={{ apply, applied }}>
        <AssistantRuntimeProvider runtime={runtime}>
          <ThreadPrimitive.Root className="chat-thread">
            <ConversationViewport>
              <ThreadPrimitive.Empty>
                <div className="arrival-briefing">
                  <p className="briefing-transition">{transition}</p>
                  {docked ? <h2 className="briefing-title">{briefing.primary.title}</h2> : <h1>{briefing.primary.title}</h1>}
                  <p className="briefing-reason">{briefing.primary.reason}</p>
                  <p className="briefing-body">{briefing.primary.body}</p>
                  {briefing.primary.evidence && (
                    <button
                      className="briefing-source"
                      onClick={() =>
                        onFocus({
                          view: "document",
                          id: briefing.primary.evidence!.documentId,
                          page: briefing.primary.evidence!.page,
                          label: briefing.primary.evidence!.name,
                        })
                      }
                    >
                      <FileText size={15} />
                      <span>
                        {briefing.primary.evidence.name} · p.{" "}
                        {briefing.primary.evidence.page}
                        <q>{briefing.primary.evidence.quote}</q>
                      </span>
                    </button>
                  )}
                  {briefing.primary.action && (
                    <button
                      className="primary briefing-action"
                      disabled={
                        busy && briefing.primary.action.kind === "resume"
                      }
                      onClick={() => onAction(briefing.primary.action!)}
                    >
                      {briefing.primary.action.label}
                      <ArrowRight size={17} />
                    </button>
                  )}
                  {briefing.primary.ask && (
                    <ThreadPrimitive.Suggestion
                      prompt={briefing.primary.ask}
                      autoSend
                      className="text-button briefing-ask"
                    >
                      Ask about this step <ArrowUp size={14} />
                    </ThreadPrimitive.Suggestion>
                  )}
                  <p className="briefing-status" role="status">
                    <ShieldCheck size={15} />
                    {briefing.status}
                  </p>
                  {briefing.later.length > 0 && (
                    <section
                      className="briefing-later"
                      aria-label="Also on your plan"
                    >
                      <h2>Also on your plan</h2>
                      {briefing.later.map((step, i) => (
                        <button
                          key={i}
                          onClick={() => step.action && onAction(step.action)}
                        >
                          <span>
                            {step.title}
                            <small>{step.reason}</small>
                          </span>
                          <ArrowRight size={15} />
                        </button>
                      ))}
                    </section>
                  )}
                  <div className="briefing-prompts">
                    {briefing.prompts
                      .filter((p) => p.prompt !== briefing.primary.ask)
                      .map((p) => (
                        <ThreadPrimitive.Suggestion
                          key={p.label}
                          prompt={p.prompt}
                          autoSend
                          className="suggestion"
                        >
                          {p.label}
                          <ArrowUp size={14} />
                        </ThreadPrimitive.Suggestion>
                      ))}
                  </div>
                </div>
              </ThreadPrimitive.Empty>
              <ThreadPrimitive.Messages
                components={{ UserMessage, AssistantMessage }}
              />
            </ConversationViewport>
            <ThreadPrimitive.If empty={false}>
              <div className="next-step-strip" role="status">
                <span>{briefing.primary.reason}</span>
                {briefing.primary.action ? (
                  <button
                    disabled={busy && briefing.primary.action.kind === "resume"}
                    onClick={() => onAction(briefing.primary.action!)}
                  >
                    {briefing.primary.action.label}
                    <ArrowRight size={14} />
                  </button>
                ) : (
                  <small>{briefing.primary.title}</small>
                )}
              </div>
            </ThreadPrimitive.If>
            <ComposerPrimitive.Root className="chat-composer">
              <ComposerPrimitive.Input
                placeholder={briefing.placeholder}
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
    </section>
  );
}
