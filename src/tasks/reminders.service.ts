import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bull';

// Demonstrates QUEUES: enqueue() returns immediately after handing the job to
// Redis — the actual work happens later in RemindersProcessor, off the request
// path. This is how you keep slow side effects (emails, webhooks) out of the
// HTTP response.
@Injectable()
export class RemindersService {
  constructor(
    @InjectQueue('reminders')
    private readonly queue: Queue,
  ) {}

  async enqueue(taskId: number): Promise<{ queued: true; jobId: string }> {
    const job = await this.queue.add('remind', { taskId });
    return { queued: true, jobId: String(job.id) };
  }
}
