import { createBullBoard } from "@bull-board/api";
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { socialPostsQueue } from "@/lib/queue";

// Create Express adapter for Bull Board
export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/api/admin/queues");

// Create Bull Board with our queue
createBullBoard({
  queues: [new BullAdapter(socialPostsQueue)],
  serverAdapter: serverAdapter,
});

export default serverAdapter;


