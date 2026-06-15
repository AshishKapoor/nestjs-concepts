import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';

// The worker side of the queue. @Processor('reminders') binds it to the same
// queue RemindersService pushes to; @Process('remind') handles that job name.
// In a real app this might send an email; here it just logs so we can prove the
// job ran asynchronously after the HTTP response already returned.
@Processor('reminders')
export class RemindersProcessor {
  private readonly logger = new Logger('Reminders');

  @Process('remind')
  handle(job: Job<{ taskId: number }>): { sent: true } {
    this.logger.log(
      `processing reminder job ${job.id} for task ${job.data.taskId}`,
    );
    return { sent: true };
  }
}
