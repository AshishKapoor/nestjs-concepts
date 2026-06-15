import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { User } from '../common/decorators/user.decorator';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { RemindersService } from './reminders.service';
import { TasksService } from './tasks.service';
import { TasksStatsService } from './tasks-stats.service';

// @Controller('tasks') => every route below is prefixed with /tasks.
// @UseGuards runs the ApiKeyGuard before every handler (unless @Public()).
// @UseInterceptors wraps every response from this controller in { data: ... }.
// @ApiTags groups these routes under "tasks" in the Swagger UI.
@ApiTags('tasks')
@UseGuards(ApiKeyGuard)
@UseInterceptors(TransformInterceptor)
@Controller('tasks')
export class TasksController {
  // The services are injected by the DI container — we never call `new`.
  constructor(
    private readonly tasksService: TasksService,
    private readonly tasksStats: TasksStatsService,
    private readonly reminders: RemindersService,
  ) {}

  @Get() // GET /tasks?status=OPEN&search=nest&page=1&limit=10
  @Public() // bypass the guard so anyone can read
  findAll(@Query() query: QueryTasksDto) {
    return this.tasksService.findAll(query);
  }

  // NOTE: this MUST be declared before @Get(':id') — otherwise "stats" would
  // match the :id param route and ParseIntPipe would 400 on it.
  @Get('stats') // GET /tasks/stats — cached for 15s (see TasksStatsService)
  @Public()
  getStats() {
    return this.tasksStats.getStats();
  }

  @Get(':id') // GET /tasks/1
  @Public()
  findOne(@Param('id', ParseIntPipe) id: number) {
    // ParseIntPipe converts "1" -> 1 and 400s on non-numeric input.
    return this.tasksService.findOne(id);
  }

  @Post() // POST /tasks   (requires x-api-key header)
  @ApiSecurity('api-key') // documents the x-api-key requirement in Swagger
  async create(@Body() dto: CreateTaskDto, @User('name') createdBy: string) {
    // @Body() is validated against CreateTaskDto. @User('name') is our custom
    // param decorator pulling the user the guard attached to the request.
    // The service is async now, so await the saved task before spreading it.
    return { ...(await this.tasksService.create(dto)), createdBy };
  }

  @Patch(':id') // PATCH /tasks/1
  @ApiSecurity('api-key')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, dto);
  }

  @Delete(':id') // DELETE /tasks/1
  @HttpCode(204) // override the default 200 -> 204 No Content
  @ApiSecurity('api-key')
  remove(@Param('id', ParseIntPipe) id: number) {
    // MUST return the promise. The service is async now, so if we don't return
    // (or await) it, the handler resolves immediately with 204 and any rejection
    // — e.g. the NotFoundException for a missing id — becomes an UNHANDLED promise
    // rejection that crashes the process instead of turning into a 404.
    return this.tasksService.remove(id);
  }

  @Post(':id/remind') // POST /tasks/1/remind — enqueue a background reminder
  @ApiSecurity('api-key')
  remind(@Param('id', ParseIntPipe) id: number) {
    // Returns immediately; RemindersProcessor handles the job off the request path.
    return this.reminders.enqueue(id);
  }
}
