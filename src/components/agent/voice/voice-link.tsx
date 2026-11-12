"use client";

import { useEffect, useRef } from "react";
import { useAgent, useCopilotKit } from "@copilotkit/react-core/v2";
import type { AbstractAgent, Message, ToolCall } from "@ag-ui/client";
import { SYSTEM_AGENT_ID, VOICE_AGENT_ID } from "@/agent/constants";
import { createSpeechChunker } from "@/agent/voice/speech-chunker";
import { formatTaskReports, formatVoiceTask, parseTaskEvent, TASK_EVENT, type TaskReport } from "@/agent/voice/protocol";
import { TaskQueue, type TaskRecord } from "@/agent/voice/task-queue";
import { world } from "@/config/world.config";
import { holdMusicDuck, play } from "@/lib/audio";
import { useSession } from "@/store/session-store";
import { focusLabel, levelFor, live, useWorldStore } from "@/store/world-store";
import { HoldRecorder, canRecord, MAX_MS } from "./recorder";
import { SpeechPlayer } from "./speaker";
import { useVoiceStore, voiceControl, voiceLive, type VoicePhase } from "./voice-store";

/**
 * ── THE VOICE LINK (orchestrator) ─────────────────────────────
 *
 *  hold V ─► mic ─► CopilotKit `transcribe` (OpenRouter STT)
 *        ─► voice agent run (AG-UI stream)
 *             text deltas ─► sentence chunker ─► /api/voice/speech ─► speaker
 *             CUSTOM "voice_task" ─► task queue
 *  task queue ─► text agent run (record tools, one task at a time)
 *             ─► "[TASK REPORT]" ─► voice agent run ─► spoken outcome
 *
 * The voice agent is run directly on its AG-UI agent (it has no
 * frontend tools), so it never contends with the text agent's runs in
 * CopilotKit's run loop; the text agent goes through
 * `copilotkit.runAgent`, which executes its world tools.
 */

const copy = world.agent.voice;
const TTS_ENDPOINT = "/api/voice/speech";
/** how long a task waits for a visitor-typed chat run to finish */
const TEXT_BUSY_TIMEOUT_MS = 90_000;

function textOf(m: Message): string {
  const c = (m as { content?: unknown }).content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map((p) => (p && typeof p === "object" && "text" in p ? String((p as { text: unknown }).text) : "")).join("");
  return "";
}

async function blobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** CopilotKit's `transcribe` route in single-endpoint mode (base64 JSON) */
async function transcribe(blob: Blob): Promise<string> {
  const res = await fetch("/api/copilotkit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      method: "transcribe",
      body: { audio: await blobToBase64(blob), mimeType: blob.type || "audio/webm", filename: "voice.webm" },
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { text?: string; message?: string; error?: string };
  if (!res.ok) throw new Error(body.message ?? body.error ?? `transcribe ${res.status}`);
  return (body.text ?? "").trim();
}

/** what the voice agent should know about the world and its tasks, right now */
function voiceContext(tasks: readonly TaskRecord[]) {
  const s = useWorldStore.getState();
  return JSON.stringify({
    broughtForward: focusLabel(s),
    visitor: { level: levelFor(s.xp), shadowsRisen: s.risen.length, sectorsOpened: s.visited.length },
    tasks: tasks.map((t) => ({ n: t.n, task: t.task, status: t.status })),
  });
}

/** the text agent's outcome for one task: its final words, or the actions it took */
function outcome(messages: Message[]): string {
  const assistant = messages.filter((m) => m.role === "assistant");
  const said = assistant.map(textOf).filter(Boolean).pop() ?? "";
  const actions = assistant
    .flatMap((m) => (m as { toolCalls?: ToolCall[] }).toolCalls ?? [])
    .map((c) => c.function.name)
    .filter((n, i, all) => all.indexOf(n) === i);
  if (!said && !actions.length) throw new Error("The text System returned nothing.");
  return [said, actions.length ? `(tools used: ${actions.join(", ")})` : ""].filter(Boolean).join(" ");
}

export function VoiceLink() {
  const { agent: voice } = useAgent({ agentId: VOICE_AGENT_ID });
  const { agent: text } = useAgent({ agentId: SYSTEM_AGENT_ID });
  const { copilotkit } = useCopilotKit();

  // agents and core change identity as the runtime connects — the long-lived machinery reads them through refs
  const refs = useRef({ voice, text, copilotkit });
  useEffect(() => {
    refs.current = { voice, text, copilotkit };
  }, [voice, text, copilotkit]);

  useEffect(() => {
    const store = useVoiceStore.getState().set;
    if (!canRecord()) {
      store({ available: false });
      return;
    }

    let disposed = false;
    /** bumps on every press — stale transcriptions / runs from an earlier turn are dropped */
    let turn = 0;
    let holding = false;
    let holdTimer = 0;
    let voiceRunning = false;
    const reports: TaskReport[] = [];

    const recorder = new HoldRecorder();
    const setPhase = (phase: VoicePhase) => {
      store({ phase });
      holdMusicDuck(phase !== "idle");
    };
    /** once nothing is recording or decoding, the phase follows the agent and the speaker */
    const settle = () => {
      const now = useVoiceStore.getState().phase;
      if (now === "listening" || now === "decoding") return;
      setPhase(speaker.speaking ? "speaking" : voiceRunning ? "thinking" : "idle");
    };
    const speaker = new SpeechPlayer({
      endpoint: TTS_ENDPOINT,
      onSpeaking: () => settle(),
      onError: (err) => console.warn("[voice] speech failed", err),
    });

    /* ── the text agent works the queue ── */
    const queue = new TaskQueue({
      onChange: (tasks) => store({ tasks }),
      onSettled: (t) => {
        reports.push({ n: t.n, task: t.task, status: t.status === "failed" ? "failed" : "done", result: t.result ?? "" });
        if (t.status === "done") play("confirm", { volume: 0.3 });
        void deliverReports();
      },
      execute: async (task) => {
        const waitUntil = Date.now() + TEXT_BUSY_TIMEOUT_MS;
        // a visitor-typed chat turn may be running on the same agent — let it finish
        while (refs.current.text.isRunning) {
          if (Date.now() > waitUntil) throw new Error("The text System stayed busy.");
          await new Promise((r) => setTimeout(r, 250));
        }
        const { text: agent, copilotkit: core } = refs.current;
        const start = agent.messages.length;
        agent.addMessage({ id: `voice-task-${task.id}`, role: "user", content: formatVoiceTask(task.n, task.task) });
        await core.runAgent({ agent });
        return outcome((agent.messages as Message[]).slice(start + 1));
      },
    });

    /* ── the voice agent ── */
    const runVoice = async (agent: AbstractAgent, myTurn: number) => {
      voiceRunning = true;
      settle();
      const chunker = createSpeechChunker();
      const muted = () => useWorldStore.getState().muted;
      const say = (lines: string[]) => {
        if (myTurn !== turn || muted()) return;
        lines.forEach((l) => speaker.say(l));
      };
      try {
        await agent.runAgent(
          { context: [{ description: "Live world state and the delegated task queue", value: voiceContext(queue.snapshot()) }] },
          {
            onTextMessageStartEvent: () => {
              if (myTurn === turn) store({ reply: "" });
            },
            onTextMessageContentEvent: ({ event, textMessageBuffer }) => {
              if (myTurn !== turn) return;
              store({ reply: textMessageBuffer + event.delta });
              say(chunker.push(event.delta));
            },
            onTextMessageEndEvent: () => say(chunker.flush()),
            onCustomEvent: ({ event }) => {
              if (event.name !== TASK_EVENT) return;
              const task = parseTaskEvent(event.value);
              if (!task) return console.warn("[voice] malformed task event", event.value);
              const queued = queue.enqueue(task);
              if (queued === "queued") play("click", { volume: 0.4 });
              // the tool already promised a report — a refused task must still get one
              else if (queued === "full") {
                reports.push({ n: 0, task: task.task, status: "failed", result: "Not started: too many tasks are already running. Ask again once they finish." });
              }
            },
          },
        );
      } catch (err) {
        if (myTurn === turn) {
          console.error("[voice] run failed", err);
          store({ notice: world.agent.offline });
          useSession.getState().set({ online: false });
        }
      } finally {
        say(chunker.flush());
        voiceRunning = false;
        settle();
        void deliverReports();
      }
    };

    /** finished tasks go back to the voice as one message, when it is free to speak */
    const deliverReports = async () => {
      if (disposed || !reports.length || voiceRunning || holding) return;
      const phase = useVoiceStore.getState().phase;
      if (phase === "listening" || phase === "decoding") return;
      const agent = refs.current.voice;
      agent.addMessage({ id: crypto.randomUUID(), role: "user", content: formatTaskReports(reports.splice(0)) });
      store({ notice: useWorldStore.getState().muted ? copy.muted : null, heard: "", reply: "" });
      await runVoice(agent, turn);
    };

    /* ── hold to talk ── */
    const press = async () => {
      if (holding || disposed) return;
      holding = true;
      const myTurn = ++turn;
      // barge-in: the visitor talks over the System
      speaker.stop();
      if (voiceRunning) refs.current.voice.abortRun();
      speaker.unlock();
      store({ notice: null, heard: "", reply: "" });
      useSession.getState().set({ mode: "voice" });
      useWorldStore.getState().completeQuest("awaken");
      setPhase("listening");
      play("open", { volume: 0.35 });
      try {
        await recorder.start();
      } catch (err) {
        holding = false;
        const blocked = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
        store({ notice: blocked ? copy.micBlocked : copy.unsupported });
        setPhase("idle");
        return;
      }
      // the key was let go while the mic was still opening
      if (!holding || myTurn !== turn) return void release();
      holdTimer = window.setTimeout(() => void release(), MAX_MS);
    };

    const release = async () => {
      window.clearTimeout(holdTimer);
      if (!holding && !recorder.recording) return;
      holding = false;
      const myTurn = turn;
      const blob = await recorder.stop();
      // a new press already started the next turn — it owns the phase now
      if (myTurn !== turn) return;
      if (!blob) {
        store({ notice: copy.nothingHeard });
        setPhase("idle");
        return void deliverReports();
      }
      setPhase("decoding");
      let said = "";
      try {
        said = await transcribe(blob);
      } catch (err) {
        console.error("[voice] transcription failed", err);
        if (myTurn === turn) store({ notice: world.agent.offline });
      }
      if (myTurn !== turn) return;
      if (!said) {
        if (!useVoiceStore.getState().notice) store({ notice: copy.nothingHeard });
        setPhase("idle");
        return void deliverReports();
      }
      store({ heard: said, phase: "thinking" });
      if (useWorldStore.getState().muted) store({ notice: copy.muted });
      play("confirm", { volume: 0.3 });
      const agent = refs.current.voice;
      // anything that finished while the visitor was talking rides along, before their words
      if (reports.length) agent.addMessage({ id: crypto.randomUUID(), role: "user", content: formatTaskReports(reports.splice(0)) });
      agent.addMessage({ id: crypto.randomUUID(), role: "user", content: said });
      await runVoice(agent, myTurn);
    };

    voiceControl.press = () => void press();
    voiceControl.release = () => void release();

    /* ── hold V (never while typing) ── */
    const typing = (e: KeyboardEvent) => !!(e.target as HTMLElement | null)?.closest("input, textarea, [contenteditable=true]");
    const onDown = (e: KeyboardEvent) => {
      if (e.code !== "KeyV" || e.repeat || typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!useWorldStore.getState().ready) return;
      e.preventDefault();
      void press();
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "KeyV") void release();
    };
    const onBlur = () => void release();
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);

    /* ── loudness for the console and the Monolith ── */
    let raf = 0;
    const meter = () => {
      const phase = useVoiceStore.getState().phase;
      const target = phase === "listening" ? recorder.level() : phase === "speaking" ? speaker.level() : 0;
      voiceLive.level += (target - voiceLive.level) * 0.35;
      live.voiceSurge =
        phase === "speaking" ? 2 + voiceLive.level * 5 : phase === "thinking" || phase === "decoding" ? 2.6 : phase === "listening" ? 1.5 + voiceLive.level * 2 : 1;
      raf = requestAnimationFrame(meter);
    };
    raf = requestAnimationFrame(meter);

    store({ available: true });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(holdTimer);
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
      voiceControl.press = () => {};
      voiceControl.release = () => {};
      queue.clear();
      speaker.dispose();
      recorder.dispose();
      holdMusicDuck(false);
      live.voiceSurge = 1;
      store({ available: false, phase: "idle" });
    };
  }, []);

  return null;
}
