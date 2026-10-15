import { validateBrief } from "@/lib/validation";
import { runPlanningAgent, safeAgentError } from "@/lib/agent";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Send a valid JSON business brief." }, { status: 400 }); }
  const result = validateBrief(body);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: string, value: unknown) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(value)}\n\n`));
      void (async () => {
        try {
          const plan = await runPlanningAgent(result.brief, step => emit("progress", { step }));
          emit("result", plan);
        } catch (error) {
          const safe = safeAgentError(error);
          emit("error", { error: safe.message, status: safe.status });
        } finally { controller.close(); }
      })();
    },
    cancel() {},
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
