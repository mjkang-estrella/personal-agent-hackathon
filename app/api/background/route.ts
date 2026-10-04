import { z } from "zod";
import { sessionId, sameOrigin, publicError } from "@/lib/session";
import { getWorkspace } from "@/lib/db";
import { setBackground } from "@/lib/background";
export async function POST(request: Request) {
  try {
    await sameOrigin();
    const { enabled } = z
      .object({ enabled: z.boolean() })
      .parse(await request.json());
    const id = await sessionId();
    await getWorkspace(id);
    return Response.json(await setBackground(id, enabled));
  } catch (e) {
    return Response.json({ error: publicError(e) }, { status: 400 });
  }
}
