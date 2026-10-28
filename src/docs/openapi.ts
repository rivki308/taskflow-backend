/**
 * OpenAPI 3 description of the whole API — served by Swagger UI at /api-docs
 * and exported to docs/openapi.json (npm run openapi:export).
 */

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const resp = (name: string) => ({ $ref: `#/components/responses/${name}` });
const dataOf = (schema: object) => ({
  type: 'object',
  required: ['data'],
  properties: { data: schema },
});
const json = (schema: object, example?: unknown) => ({
  content: { 'application/json': { schema, ...(example !== undefined && { example }) } },
});
const idParam = (description: string) => ({
  name: 'id',
  in: 'path',
  required: true,
  description,
  schema: { type: 'integer', minimum: 1 },
  example: 1,
});
const bearer = [{ bearerAuth: [] }];

const exampleUser = { id: 1, name: 'Dana Admin', email: 'admin@taskflow.test', role: 'Admin', createdAt: '2026-10-01T08:00:00.000Z' };
const exampleTask = {
  id: 1,
  title: 'Design the login screen',
  description: 'Create the layout and validation messages for the login page',
  priority: 'High',
  status: 'In Progress',
  dueDate: '2026-10-25',
  isOverdue: false,
  assignedTo: { id: 2, name: 'Noa Cohen' },
  createdBy: { id: 1, name: 'Dana Admin' },
  project: { id: 1, name: 'Website Redesign' },
  commentCount: 2,
  createdAt: '2026-10-10T09:00:00.000Z',
  updatedAt: '2026-10-12T14:30:00.000Z',
};
const exampleProject = {
  id: 1,
  name: 'Website Redesign',
  description: 'New design for the company website',
  startDate: '2026-09-01',
  endDate: '2026-12-31',
  status: 'Active',
  createdBy: { id: 1, name: 'Dana Admin' },
  taskCount: 5,
  createdAt: '2026-09-01T08:00:00.000Z',
};
const exampleComment = {
  id: 1,
  taskId: 1,
  content: 'I started working on this today',
  user: { id: 2, name: 'Noa Cohen', role: 'Employee' },
  createdAt: '2026-10-12T14:30:00.000Z',
};

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'TaskFlow Pro API',
    version: '1.0.0',
    description: [
      'Backend API for **TaskFlow Pro** — team task management.',
      '',
      '### How to use the protected endpoints',
      '1. Open **POST /api/auth/login** → *Try it out* → *Execute* (demo users are in the example).',
      '2. Copy the `token` value from the response.',
      '3. Click **Authorize** (top right), paste the token (without the word Bearer) and click *Authorize*.',
      '4. Now every request sends `Authorization: Bearer <token>`.',
      '',
      '### Roles',
      '- **Admin** — sees and manages everything.',
      '- **Employee** — sees only tasks assigned to them, can change only their status and add comments.',
      '',
      '### Response format',
      'Success: `{ "data": ... }` (lists of tasks also include `pagination`).  ',
      'Error: `{ "error": { "code": "...", "message": "...", "details": [...] } }`',
    ].join('\n'),
  },
  servers: [{ url: '/', description: 'This server' }],
  tags: [
    { name: 'Health', description: 'Server status' },
    { name: 'Auth', description: 'Login, logout and current user' },
    { name: 'Dashboard', description: 'Summary numbers for the dashboard screen' },
    { name: 'Tasks', description: 'The main object of the system' },
    { name: 'Comments', description: 'Comments on a task' },
    { name: 'Projects', description: 'Projects that group tasks' },
    { name: 'Users', description: 'Employees management (Admin only)' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste the token from POST /api/auth/login (without the word "Bearer").',
      },
    },
    schemas: {
      Role: { type: 'string', enum: ['Admin', 'Employee'] },
      TaskStatus: { type: 'string', enum: ['To Do', 'In Progress', 'Done'] },
      TaskPriority: { type: 'string', enum: ['Low', 'Medium', 'High'] },
      ProjectStatus: { type: 'string', enum: ['Active', 'Completed', 'On Hold'] },
      UserSummary: {
        type: 'object',
        required: ['id', 'name'],
        properties: { id: { type: 'integer' }, name: { type: 'string' } },
      },
      ProjectSummary: {
        type: 'object',
        required: ['id', 'name'],
        properties: { id: { type: 'integer' }, name: { type: 'string' } },
      },
      User: {
        type: 'object',
        required: ['id', 'name', 'email', 'role', 'createdAt'],
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: ref('Role'),
          createdAt: { type: 'string', format: 'date-time' },
        },
        example: exampleUser,
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        additionalProperties: false,
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      LoginResponse: {
        type: 'object',
        required: ['token', 'tokenType', 'expiresAt', 'user'],
        properties: {
          token: { type: 'string', description: 'JWT access token' },
          tokenType: { type: 'string', enum: ['Bearer'] },
          expiresAt: { type: 'string', format: 'date-time' },
          user: ref('User'),
        },
      },
      CreateUserRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', maxLength: 100 },
          email: { type: 'string', format: 'email', maxLength: 255 },
          password: { type: 'string', minLength: 8, maxLength: 128, description: 'At least 8 characters, a letter and a digit' },
          role: { allOf: [ref('Role')], default: 'Employee' },
        },
      },
      Project: {
        type: 'object',
        required: ['id', 'name', 'description', 'startDate', 'endDate', 'status', 'createdBy', 'taskCount', 'createdAt'],
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date', nullable: true },
          status: ref('ProjectStatus'),
          createdBy: ref('UserSummary'),
          taskCount: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
        example: exampleProject,
      },
      CreateProjectRequest: {
        type: 'object',
        required: ['name', 'startDate'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', maxLength: 150 },
          description: { type: 'string', nullable: true, maxLength: 5000 },
          startDate: { type: 'string', format: 'date', example: '2026-11-01' },
          endDate: { type: 'string', format: 'date', nullable: true, description: 'Cannot be earlier than startDate' },
          status: { allOf: [ref('ProjectStatus')], default: 'Active' },
        },
      },
      UpdateProjectRequest: {
        type: 'object',
        additionalProperties: false,
        minProperties: 1,
        properties: {
          name: { type: 'string', maxLength: 150 },
          description: { type: 'string', nullable: true, maxLength: 5000 },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date', nullable: true },
          status: ref('ProjectStatus'),
        },
      },
      Task: {
        type: 'object',
        required: [
          'id', 'title', 'description', 'priority', 'status', 'dueDate', 'isOverdue',
          'assignedTo', 'createdBy', 'project', 'commentCount', 'createdAt', 'updatedAt',
        ],
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          priority: ref('TaskPriority'),
          status: ref('TaskStatus'),
          dueDate: { type: 'string', format: 'date' },
          isOverdue: { type: 'boolean', description: 'true when dueDate has passed and status is not Done' },
          assignedTo: ref('UserSummary'),
          createdBy: ref('UserSummary'),
          project: ref('ProjectSummary'),
          commentCount: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        example: exampleTask,
      },
      CreateTaskRequest: {
        type: 'object',
        required: ['title', 'assignedTo', 'projectId', 'priority', 'dueDate'],
        additionalProperties: false,
        properties: {
          title: { type: 'string', maxLength: 200 },
          description: { type: 'string', nullable: true, maxLength: 5000 },
          assignedTo: { type: 'integer', description: 'id of an existing user with role Employee' },
          projectId: { type: 'integer', description: 'id of an existing project' },
          priority: ref('TaskPriority'),
          status: { allOf: [ref('TaskStatus')], default: 'To Do' },
          dueDate: { type: 'string', format: 'date' },
        },
      },
      UpdateTaskRequest: {
        type: 'object',
        additionalProperties: false,
        minProperties: 1,
        description: '**Admin**: any of these fields. **Employee**: only `status` (other fields → 403).',
        properties: {
          title: { type: 'string', maxLength: 200 },
          description: { type: 'string', nullable: true, maxLength: 5000 },
          assignedTo: { type: 'integer' },
          projectId: { type: 'integer' },
          priority: ref('TaskPriority'),
          status: ref('TaskStatus'),
          dueDate: { type: 'string', format: 'date' },
        },
      },
      Pagination: {
        type: 'object',
        required: ['page', 'pageSize', 'total', 'totalPages'],
        properties: {
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
          total: { type: 'integer', description: 'Number of tasks matching the filters' },
          totalPages: { type: 'integer' },
        },
      },
      TaskList: {
        type: 'object',
        required: ['data', 'pagination'],
        properties: {
          data: { type: 'array', items: ref('Task') },
          pagination: ref('Pagination'),
        },
      },
      Comment: {
        type: 'object',
        required: ['id', 'taskId', 'content', 'user', 'createdAt'],
        properties: {
          id: { type: 'integer' },
          taskId: { type: 'integer' },
          content: { type: 'string' },
          user: {
            type: 'object',
            required: ['id', 'name', 'role'],
            properties: { id: { type: 'integer' }, name: { type: 'string' }, role: ref('Role') },
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
        example: exampleComment,
      },
      CreateCommentRequest: {
        type: 'object',
        required: ['content'],
        additionalProperties: false,
        properties: { content: { type: 'string', minLength: 1, maxLength: 2000 } },
      },
      DashboardSummary: {
        type: 'object',
        required: ['scope', 'tasks'],
        properties: {
          scope: { type: 'string', enum: ['all', 'mine'], description: 'all = admin, mine = employee' },
          tasks: {
            type: 'object',
            required: ['total', 'open', 'overdue', 'byStatus'],
            properties: {
              total: { type: 'integer' },
              open: { type: 'integer', description: 'Not Done' },
              overdue: { type: 'integer' },
              byStatus: {
                type: 'object',
                required: ['To Do', 'In Progress', 'Done'],
                properties: {
                  'To Do': { type: 'integer' },
                  'In Progress': { type: 'integer' },
                  Done: { type: 'integer' },
                },
              },
            },
          },
          projects: {
            type: 'object',
            description: 'Admin only',
            properties: { total: { type: 'integer' }, active: { type: 'integer' } },
          },
          employees: { type: 'integer', description: 'Admin only' },
        },
      },
      Health: {
        type: 'object',
        required: ['status', 'database', 'uptimeSeconds', 'timestamp'],
        properties: {
          status: { type: 'string', enum: ['ok', 'error'] },
          database: { type: 'string', enum: ['ok', 'error'] },
          uptimeSeconds: { type: 'integer' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: { field: { type: 'string' }, message: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
    responses: {
      ValidationError: {
        description: 'Invalid input (400)',
        ...json(ref('Error'), {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: [{ field: 'priority', message: 'priority must be one of: Low, Medium, High' }],
          },
        }),
      },
      Unauthorized: {
        description: 'Missing, invalid, expired or revoked token (401)',
        ...json(ref('Error'), { error: { code: 'UNAUTHORIZED', message: 'Missing Authorization header. Send: Authorization: Bearer <token>' } }),
      },
      Forbidden: {
        description: 'Logged in, but not allowed (403)',
        ...json(ref('Error'), { error: { code: 'FORBIDDEN', message: 'This action requires role: Admin' } }),
      },
      NotFound: {
        description: 'Resource does not exist (404)',
        ...json(ref('Error'), { error: { code: 'NOT_FOUND', message: 'Task not found' } }),
      },
      Conflict: {
        description: 'Conflict, e.g. email already exists (409)',
        ...json(ref('Error'), { error: { code: 'CONFLICT', message: 'A user with this email already exists' } }),
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Server and database status',
        description: 'Public. Used by Render health check.',
        responses: {
          200: { description: 'Server and database are working', ...json(ref('Health')) },
          503: { description: 'Database is not reachable', ...json(ref('Health')) },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in and receive a JWT',
        description:
          'Public. Returns a token valid for a limited time (JWT_EXPIRES_IN). Limited to a few failed attempts per IP per 15 minutes.\n\n' +
          'Demo users (local/development seed): `admin@taskflow.test` / `Admin123!`, `noa@taskflow.test` / `Employee123!`, `yossi@taskflow.test` / `Employee123!`',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('LoginRequest'),
              examples: {
                admin: { summary: 'Admin (demo)', value: { email: 'admin@taskflow.test', password: 'Admin123!' } },
                employee: { summary: 'Employee Noa (demo)', value: { email: 'noa@taskflow.test', password: 'Employee123!' } },
                employee2: { summary: 'Employee Yossi (demo)', value: { email: 'yossi@taskflow.test', password: 'Employee123!' } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Logged in',
            ...json(dataOf(ref('LoginResponse')), {
              data: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', tokenType: 'Bearer', expiresAt: '2026-10-19T12:00:00.000Z', user: exampleUser },
            }),
          },
          400: resp('ValidationError'),
          401: {
            description: 'Wrong email or password',
            ...json(ref('Error'), { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }),
          },
          429: {
            description: 'Too many login attempts',
            ...json(ref('Error'), { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts. Try again in 15 minutes' } }),
          },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Log out (revoke all tokens of this user)',
        description: 'Any logged-in user. After logout every previous token of the user returns 401 TOKEN_REVOKED. The client should also delete the token it stored.',
        security: bearer,
        responses: {
          200: { description: 'Logged out', ...json(dataOf({ type: 'object', properties: { message: { type: 'string' } } }), { data: { message: 'Logged out. The token is no longer valid' } }) },
          401: resp('Unauthorized'),
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'The logged-in user',
        description: 'Any logged-in user. Use it when the app starts to know who is logged in and what their role is.',
        security: bearer,
        responses: {
          200: { description: 'Current user (never includes the password)', ...json(dataOf(ref('User')), { data: exampleUser }) },
          401: resp('Unauthorized'),
        },
      },
    },
    '/api/dashboard/summary': {
      get: {
        tags: ['Dashboard'],
        summary: 'Numbers for the dashboard',
        description: 'Admin: all tasks + projects and employees counts. Employee: only their own tasks.',
        security: bearer,
        responses: {
          200: {
            description: 'Summary',
            ...json(dataOf(ref('DashboardSummary')), {
              data: {
                scope: 'all',
                tasks: { total: 12, open: 8, overdue: 2, byStatus: { 'To Do': 5, 'In Progress': 3, Done: 4 } },
                projects: { total: 3, active: 2 },
                employees: 2,
              },
            }),
          },
          401: resp('Unauthorized'),
        },
      },
    },
    '/api/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'List tasks (search, filter, sort, pagination)',
        description: 'Admin: all tasks. Employee: only tasks assigned to them (the assignedTo filter is ignored for employees).',
        security: bearer,
        parameters: [
          { name: 'search', in: 'query', description: 'Text inside the title (case-insensitive)', schema: { type: 'string', maxLength: 100 } },
          { name: 'status', in: 'query', schema: ref('TaskStatus') },
          { name: 'priority', in: 'query', schema: ref('TaskPriority') },
          { name: 'projectId', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'assignedTo', in: 'query', description: 'Admin only: tasks of one employee', schema: { type: 'integer', minimum: 1 } },
          { name: 'overdue', in: 'query', description: 'true = only overdue, false = only not overdue', schema: { type: 'string', enum: ['true', 'false'] } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['dueDate', 'createdAt', 'title'], default: 'dueDate' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
        ],
        responses: {
          200: {
            description: 'One page of tasks',
            ...json(ref('TaskList'), { data: [exampleTask], pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 } }),
          },
          400: resp('ValidationError'),
          401: resp('Unauthorized'),
        },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Create a task',
        description: 'Admin only. `createdBy` is taken from the token. The assignee must be an existing Employee and the project must exist.',
        security: bearer,
        requestBody: {
          required: true,
          ...json(ref('CreateTaskRequest'), {
            title: 'Prepare the monthly report',
            description: 'Summary of all completed tasks',
            assignedTo: 2,
            projectId: 1,
            priority: 'Medium',
            dueDate: '2026-11-15',
          }),
        },
        responses: {
          201: { description: 'Created', ...json(dataOf(ref('Task')), { data: exampleTask }) },
          400: resp('ValidationError'),
          401: resp('Unauthorized'),
          403: resp('Forbidden'),
        },
      },
    },
    '/api/tasks/{id}': {
      parameters: [idParam('Task id')],
      get: {
        tags: ['Tasks'],
        summary: 'Task details',
        description: 'Admin: any task. Employee: only a task assigned to them (otherwise 403).',
        security: bearer,
        responses: {
          200: { description: 'The task', ...json(dataOf(ref('Task')), { data: exampleTask }) },
          400: resp('ValidationError'),
          401: resp('Unauthorized'),
          403: resp('Forbidden'),
          404: resp('NotFound'),
        },
      },
      patch: {
        tags: ['Tasks'],
        summary: 'Update a task',
        description: 'Admin: any field. Employee: only `status`, and only on a task assigned to them. Unknown fields → 400; protected fields sent by an employee → 403.',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('UpdateTaskRequest'),
              examples: {
                employeeStatus: { summary: 'Employee changes status', value: { status: 'Done' } },
                adminEdit: { summary: 'Admin edits fields', value: { priority: 'High', dueDate: '2026-11-01', assignedTo: 3 } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated task', ...json(dataOf(ref('Task')), { data: exampleTask }) },
          400: resp('ValidationError'),
          401: resp('Unauthorized'),
          403: resp('Forbidden'),
          404: resp('NotFound'),
        },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Delete a task (and its comments)',
        description: 'Admin only. The task and its comments are deleted in one transaction.',
        security: bearer,
        responses: {
          204: { description: 'Deleted (no body)' },
          401: resp('Unauthorized'),
          403: resp('Forbidden'),
          404: resp('NotFound'),
        },
      },
    },
    '/api/tasks/{id}/comments': {
      parameters: [idParam('Task id')],
      get: {
        tags: ['Comments'],
        summary: 'Comments of a task (oldest first)',
        description: 'Any user who may view the task.',
        security: bearer,
        responses: {
          200: { description: 'Comments', ...json(dataOf({ type: 'array', items: ref('Comment') }), { data: [exampleComment] }) },
          401: resp('Unauthorized'),
          403: resp('Forbidden'),
          404: resp('NotFound'),
        },
      },
      post: {
        tags: ['Comments'],
        summary: 'Add a comment to a task',
        description: 'Any user who may view the task. The author is taken from the token.',
        security: bearer,
        requestBody: { required: true, ...json(ref('CreateCommentRequest'), { content: 'I started working on this today' }) },
        responses: {
          201: { description: 'Created', ...json(dataOf(ref('Comment')), { data: exampleComment }) },
          400: resp('ValidationError'),
          401: resp('Unauthorized'),
          403: resp('Forbidden'),
          404: resp('NotFound'),
        },
      },
    },
    '/api/projects': {
      get: {
        tags: ['Projects'],
        summary: 'List projects',
        description: 'Admin: all projects. Employee: only projects that contain a task assigned to them.',
        security: bearer,
        parameters: [
          { name: 'status', in: 'query', schema: ref('ProjectStatus') },
          { name: 'search', in: 'query', description: 'Text inside the project name', schema: { type: 'string', maxLength: 100 } },
        ],
        responses: {
          200: { description: 'Projects', ...json(dataOf({ type: 'array', items: ref('Project') }), { data: [exampleProject] }) },
          400: resp('ValidationError'),
          401: resp('Unauthorized'),
        },
      },
      post: {
        tags: ['Projects'],
        summary: 'Create a project',
        description: 'Admin only. endDate cannot be earlier than startDate.',
        security: bearer,
        requestBody: {
          required: true,
          ...json(ref('CreateProjectRequest'), { name: 'Mobile App', description: 'First version of the app', startDate: '2026-11-01', endDate: '2027-02-28', status: 'Active' }),
        },
        responses: {
          201: { description: 'Created', ...json(dataOf(ref('Project')), { data: exampleProject }) },
          400: resp('ValidationError'),
          401: resp('Unauthorized'),
          403: resp('Forbidden'),
        },
      },
    },
    '/api/projects/{id}': {
      parameters: [idParam('Project id')],
      get: {
        tags: ['Projects'],
        summary: 'Project details',
        description: 'Admin: any project. Employee: only a project that contains their task.',
        security: bearer,
        responses: {
          200: { description: 'The project', ...json(dataOf(ref('Project')), { data: exampleProject }) },
          401: resp('Unauthorized'),
          403: resp('Forbidden'),
          404: resp('NotFound'),
        },
      },
      patch: {
        tags: ['Projects'],
        summary: 'Update a project',
        description: 'Admin only. Send only the fields to change.',
        security: bearer,
        requestBody: { required: true, ...json(ref('UpdateProjectRequest'), { status: 'Completed', endDate: '2026-12-01' }) },
        responses: {
          200: { description: 'Updated project', ...json(dataOf(ref('Project')), { data: exampleProject }) },
          400: resp('ValidationError'),
          401: resp('Unauthorized'),
          403: resp('Forbidden'),
          404: resp('NotFound'),
        },
      },
    },
    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'List users (for the Employees screen and the "assign to" dropdown)',
        description: 'Admin only. Never returns passwords.',
        security: bearer,
        parameters: [
          { name: 'role', in: 'query', description: 'Use role=Employee for the assignee dropdown', schema: ref('Role') },
          { name: 'search', in: 'query', description: 'Text inside name or email', schema: { type: 'string', maxLength: 100 } },
        ],
        responses: {
          200: { description: 'Users', ...json(dataOf({ type: 'array', items: ref('User') }), { data: [exampleUser] }) },
          400: resp('ValidationError'),
          401: resp('Unauthorized'),
          403: resp('Forbidden'),
        },
      },
      post: {
        tags: ['Users'],
        summary: 'Create a user (add an employee)',
        description: 'Admin only. The password is stored only as a bcrypt hash.',
        security: bearer,
        requestBody: {
          required: true,
          ...json(ref('CreateUserRequest'), { name: 'Maya Levi', email: 'maya@taskflow.test', password: 'Welcome123', role: 'Employee' }),
        },
        responses: {
          201: { description: 'Created', ...json(dataOf(ref('User')), { data: { ...exampleUser, id: 4, name: 'Maya Levi', email: 'maya@taskflow.test', role: 'Employee' } }) },
          400: resp('ValidationError'),
          401: resp('Unauthorized'),
          403: resp('Forbidden'),
          409: resp('Conflict'),
        },
      },
    },
  },
};
