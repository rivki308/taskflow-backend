import type { PrismaClient } from '@prisma/client';
import { hashPassword } from '../auth/password';
import { parseDateOnly, formatDateOnly } from '../utils/dates';

export interface SeedOptions {
  adminEmail: string;
  adminPassword: string;
  employeePassword: string;
}

/** Default demo passwords — used ONLY outside production. */
export const DEV_SEED_DEFAULTS: SeedOptions = {
  adminEmail: 'admin@taskflow.test',
  adminPassword: 'Admin123!',
  employeePassword: 'Employee123!',
};

/** Date relative to today, e.g. daysFromToday(-3) = 3 days ago */
function daysFromToday(days: number): Date {
  const today = parseDateOnly(new Date().toISOString().slice(0, 10));
  return parseDateOnly(formatDateOnly(new Date(today.getTime() + days * 24 * 60 * 60 * 1000)));
}

/**
 * Deletes all data and inserts demo data (invented names only):
 * 1 admin, 2 employees, 3 projects, 12 tasks (some overdue), comments.
 * Runs in one transaction — either everything is inserted or nothing.
 */
export async function seedDatabase(prisma: PrismaClient, options: SeedOptions) {
  const [adminHash, employeeHash] = await Promise.all([
    hashPassword(options.adminPassword),
    hashPassword(options.employeePassword),
  ]);

  return prisma.$transaction(async (tx) => {
    await tx.comment.deleteMany();
    await tx.task.deleteMany();
    await tx.project.deleteMany();
    await tx.user.deleteMany();

    const admin = await tx.user.create({
      data: { name: 'Dana Admin', email: options.adminEmail.toLowerCase(), passwordHash: adminHash, role: 'Admin' },
    });
    const noa = await tx.user.create({
      data: { name: 'Noa Cohen', email: 'noa@taskflow.test', passwordHash: employeeHash, role: 'Employee' },
    });
    const yossi = await tx.user.create({
      data: { name: 'Yossi Levi', email: 'yossi@taskflow.test', passwordHash: employeeHash, role: 'Employee' },
    });

    const website = await tx.project.create({
      data: {
        name: 'Website Redesign',
        description: 'New design for the company website',
        startDate: daysFromToday(-40),
        endDate: daysFromToday(60),
        status: 'Active',
        createdById: admin.id,
      },
    });
    const mobile = await tx.project.create({
      data: {
        name: 'Mobile App',
        description: 'First version of the mobile application',
        startDate: daysFromToday(-10),
        endDate: null,
        status: 'Active',
        createdById: admin.id,
      },
    });
    const onboarding = await tx.project.create({
      data: {
        name: 'Employee Onboarding',
        description: 'Training materials for new employees',
        startDate: daysFromToday(-90),
        endDate: daysFromToday(-5),
        status: 'Completed',
        createdById: admin.id,
      },
    });

    type Seed = {
      title: string;
      description?: string;
      assignee: number;
      project: number;
      priority: 'Low' | 'Medium' | 'High';
      status: 'To Do' | 'In Progress' | 'Done';
      due: number;
    };

    const taskSeeds: Seed[] = [
      { title: 'Design the login screen', description: 'Layout and validation messages for the login page', assignee: noa.id, project: website.id, priority: 'High', status: 'In Progress', due: 5 },
      { title: 'Write homepage content', assignee: noa.id, project: website.id, priority: 'Medium', status: 'To Do', due: 12 },
      { title: 'Fix broken links in footer', assignee: noa.id, project: website.id, priority: 'Low', status: 'Done', due: -7 },
      { title: 'Prepare color palette', description: 'Choose brand colors with good contrast', assignee: noa.id, project: website.id, priority: 'Medium', status: 'To Do', due: -2 },
      { title: 'Optimize website images', assignee: yossi.id, project: website.id, priority: 'Low', status: 'To Do', due: 20 },
      { title: 'Set up analytics report', assignee: yossi.id, project: website.id, priority: 'High', status: 'In Progress', due: -1 },
      { title: 'Build app navigation menu', assignee: noa.id, project: mobile.id, priority: 'High', status: 'To Do', due: 9 },
      { title: 'Create app icons', assignee: yossi.id, project: mobile.id, priority: 'Medium', status: 'In Progress', due: 3 },
      { title: 'Test login on Android', assignee: yossi.id, project: mobile.id, priority: 'High', status: 'To Do', due: 14 },
      { title: 'Write release notes', assignee: yossi.id, project: mobile.id, priority: 'Low', status: 'To Do', due: 30 },
      { title: 'Record welcome video', assignee: noa.id, project: onboarding.id, priority: 'Medium', status: 'Done', due: -20 },
      { title: 'Update onboarding checklist', assignee: yossi.id, project: onboarding.id, priority: 'Low', status: 'Done', due: -12 },
    ];

    const tasks = [];
    for (const seed of taskSeeds) {
      tasks.push(
        await tx.task.create({
          data: {
            title: seed.title,
            description: seed.description ?? null,
            assignedToId: seed.assignee,
            createdById: admin.id,
            projectId: seed.project,
            priority: seed.priority,
            status: seed.status,
            dueDate: daysFromToday(seed.due),
          },
        }),
      );
    }

    await tx.comment.createMany({
      data: [
        { taskId: tasks[0].id, userId: admin.id, content: 'Please follow the new brand guidelines.' },
        { taskId: tasks[0].id, userId: noa.id, content: 'I started working on this today.' },
        { taskId: tasks[5].id, userId: yossi.id, content: 'Waiting for access to the analytics account.' },
        { taskId: tasks[7].id, userId: admin.id, content: 'Use the colors from the website project.' },
      ],
    });

    return { admin, employees: [noa, yossi], projects: [website, mobile, onboarding], tasks };
  });
}
