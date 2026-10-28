# 📗 מדריך API לצד ה־React — TaskFlow Pro

המסמך מסביר **מה השרת מצפה לקבל ומה הוא מחזיר**, כדי שתוכלי לכתוב בעצמך את צד ה־React.
אין כאן קוד React. יש כאן רק כתובות, מבני נתונים, דוגמאות JSON וכללים.

> 💡 את כל הנתיבים אפשר לנסות בעצמך ב־Swagger (`/api-docs`) לפני שכותבים קוד.

---

## 1. כתובת השרת (Base URL)

| סביבה | Base URL |
|-------|----------|
| מחשב מקומי | `http://localhost:4000` |
| ענן (Render) | `https://YOUR-APP.onrender.com` (הכתובת שקיבלת ב־Render) |

כל הנתיבים מתחילים ב־`/api`. לדוגמה: `http://localhost:4000/api/tasks`.

**טיפ:** שמרי את ה־Base URL במשתנה סביבה של צד הלקוח (ב־Vite: קובץ `.env` עם `VITE_API_URL=http://localhost:4000`), ולא בתוך הקוד.

**CORS:** השרת מקבל בקשות רק מכתובות שמופיעות ב־`CORS_ORIGINS`. בפיתוח זה `http://localhost:5173` (ברירת המחדל של Vite). אם צד הלקוח רץ על פורט אחר, עדכני את `CORS_ORIGINS` בקובץ `.env` של השרת.

---

## 2. איך עובדת ההתחברות (Authentication)

1. המשתמש ממלא אימייל וסיסמה במסך ההתחברות.
2. שולחים `POST /api/auth/login`.
3. השרת מחזיר `token` (JWT), את `expiresAt` ואת פרטי המשתמש, כולל `role`.
4. שומרים את הטוקן בצד הלקוח, למשל ב־`localStorage`, ואת פרטי המשתמש במצב משותף (Context או Redux).
5. **בכל בקשה אחרת** שולחים את הטוקן בכותרת (Header):
   ```
   Authorization: Bearer <token>
   ```
6. כשהאפליקציה עולה מחדש (רענון דף) ויש טוקן שמור, קוראים ל־`GET /api/auth/me` כדי לדעת מי מחובר. אם חוזר 401, הטוקן לא תקף: מוחקים אותו ומעבירים למסך ההתחברות.
7. **התנתקות:** שולחים `POST /api/auth/logout` עם הטוקן, ואז מוחקים את הטוקן מצד הלקוח.

**תוקף:** הטוקן תקף לזמן מוגבל (ברירת מחדל שעתיים, השדה `expiresAt`). אחרי זה כל בקשה מחזירה 401 עם `TOKEN_EXPIRED`, וצריך להתחבר מחדש.

**חשוב:** הסתרת כפתורים לפי `role` היא רק לנוחות המשתמש. השרת בודק הרשאות בכל בקשה בכל מקרה.

### דוגמת בקשה בפורמט HTTP
```http
GET /api/tasks?status=Done HTTP/1.1
Host: localhost:4000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
ובבקשות עם גוף (POST / PATCH) מוסיפים גם:
```http
Content-Type: application/json
```

---

## 3. מבנה התשובות

**הצלחה:** התוכן תמיד נמצא בתוך `data`:
```json
{ "data": { "id": 1, "title": "..." } }
```
**רשימת משימות** מגיעה גם עם מידע על העימוד:
```json
{ "data": [ ... ], "pagination": { "page": 1, "pageSize": 10, "total": 12, "totalPages": 2 } }
```
**מחיקה** מצליחה עם קוד `204` ובלי גוף.

**שגיאה:** תמיד באותו מבנה:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      { "field": "title", "message": "title cannot be empty" },
      { "field": "dueDate", "message": "Must be a valid date in YYYY-MM-DD format" }
    ]
  }
}
```
`details` מופיע רק בשגיאות ולידציה. אפשר להשתמש ב־`field` כדי להציג את השגיאה ליד השדה המתאים בטופס.

---

## 4. קודי שגיאה

| HTTP | `error.code` | מתי | מה כדאי לעשות בצד הלקוח |
|------|--------------|-----|---------------------------|
| 400 | `VALIDATION_ERROR` | נתונים לא תקינים, או שדה לא מוכר | להציג את ההודעות מ־`details` ליד השדות |
| 400 | `INVALID_JSON` | גוף הבקשה אינו JSON תקין | לבדוק שנשלח `JSON.stringify` ו־Content-Type |
| 401 | `UNAUTHORIZED` | לא נשלח טוקן | להעביר למסך התחברות |
| 401 | `INVALID_TOKEN` | טוקן לא תקין | למחוק טוקן ולהעביר להתחברות |
| 401 | `TOKEN_EXPIRED` | פג התוקף | למחוק טוקן ולהעביר להתחברות |
| 401 | `TOKEN_REVOKED` | המשתמש התנתק | למחוק טוקן ולהעביר להתחברות |
| 401 | `INVALID_CREDENTIALS` | אימייל או סיסמה שגויים (רק ב־login) | "אימייל או סיסמה שגויים" |
| 403 | `FORBIDDEN` | מחובר, אבל אין הרשאה | "אין לך הרשאה לפעולה זו" |
| 404 | `NOT_FOUND` | המשאב לא קיים | "לא נמצא" |
| 409 | `CONFLICT` | למשל אימייל שכבר קיים | להציג את ההודעה |
| 413 | `PAYLOAD_TOO_LARGE` | גוף גדול מ־100KB | |
| 429 | `TOO_MANY_REQUESTS` | יותר מדי ניסיונות התחברות כושלים | "נסי שוב בעוד 15 דקות" |
| 500 | `INTERNAL_ERROR` | תקלה בשרת | "שגיאה, נסי שוב" |
| 503 | `DATABASE_UNAVAILABLE` | אין חיבור למסד | "השרת לא זמין כרגע" |

---

## 5. מבני הנתונים (TypeScript)

אלה הגדרות **טיפוסים בלבד**, ומותר להעתיק אותן לתיקיית `types` בצד הלקוח:

```ts
type Role = 'Admin' | 'Employee';
type TaskStatus = 'To Do' | 'In Progress' | 'Done';
type TaskPriority = 'Low' | 'Medium' | 'High';
type ProjectStatus = 'Active' | 'Completed' | 'On Hold';

interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  createdAt: string;            // ISO, e.g. "2026-10-01T08:00:00.000Z"
}

interface UserSummary { id: number; name: string; }

interface Task {
  id: number;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;              // "YYYY-MM-DD"
  isOverdue: boolean;           // dueDate passed and status is not Done
  assignedTo: UserSummary;
  createdBy: UserSummary;
  project: { id: number; name: string };
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: number;
  name: string;
  description: string | null;
  startDate: string;            // "YYYY-MM-DD"
  endDate: string | null;
  status: ProjectStatus;
  createdBy: UserSummary;
  taskCount: number;
  createdAt: string;
}

interface Comment {
  id: number;
  taskId: number;
  content: string;
  user: { id: number; name: string; role: Role };
  createdAt: string;
}

interface Pagination { page: number; pageSize: number; total: number; totalPages: number; }

interface DashboardSummary {
  scope: 'all' | 'mine';
  tasks: {
    total: number;
    open: number;
    overdue: number;
    byStatus: { 'To Do': number; 'In Progress': number; 'Done': number };
  };
  projects?: { total: number; active: number };   // Admin only
  employees?: number;                              // Admin only
}

interface ApiError {
  error: { code: string; message: string; details?: { field: string; message: string }[] };
}
```

**שימי לב:** תאריכים כמו `dueDate` נשלחים ומתקבלים כמחרוזת `"YYYY-MM-DD"`. זה בדיוק הפורמט של `<input type="date">`.

---

## 6. הרשאות — מי יכול מה

| פעולה | Admin | Employee |
|-------|:-----:|:--------:|
| התחברות / `me` / התנתקות | ✅ | ✅ |
| לוח בקרה | ✅ (הכול) | ✅ (רק שלו) |
| רשימת משימות | ✅ כל המשימות | ✅ רק משימות ששויכו אליו |
| פרטי משימה | ✅ | ✅ רק שלו (אחרת 403) |
| יצירת משימה | ✅ | ❌ 403 |
| עריכת משימה | ✅ כל השדות | ✅ **רק `status`**, ורק במשימה שלו |
| מחיקת משימה | ✅ | ❌ 403 |
| צפייה בהערות והוספת הערה | ✅ | ✅ במשימות שלו |
| רשימת פרויקטים | ✅ הכול | ✅ רק פרויקטים שיש בהם משימות שלו |
| יצירה ועריכה של פרויקט | ✅ | ❌ 403 |
| רשימת משתמשים והוספת עובד | ✅ | ❌ 403 |

---

## 7. אילו Endpoints צריך לכל מסך

### 🔐 מסך Login
| פעולה | בקשה |
|-------|------|
| התחברות | `POST /api/auth/login` |

בקשה:
```json
{ "email": "admin@taskflow.test", "password": "Admin123!" }
```
תשובה 200:
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresAt": "2026-10-19T12:00:00.000Z",
    "user": { "id": 1, "name": "Dana Admin", "email": "admin@taskflow.test", "role": "Admin", "createdAt": "2026-10-01T08:00:00.000Z" }
  }
}
```
שדות חובה בטופס: `email` (אימייל תקין), `password` (לא ריק).
שגיאות: `401 INVALID_CREDENTIALS`, `400 VALIDATION_ERROR`, `429 TOO_MANY_REQUESTS`.
אחרי ההתחברות: מנהל ועובד יכולים להגיע לאותו Dashboard, והתוכן שלו משתנה לפי התפקיד.

### 🏠 מסך Dashboard
| פעולה | בקשה |
|-------|------|
| מספרים לסיכום | `GET /api/dashboard/summary` |
| (אופציונלי) משימות באיחור | `GET /api/tasks?overdue=true&pageSize=5` |

תשובה למנהל:
```json
{
  "data": {
    "scope": "all",
    "tasks": { "total": 12, "open": 9, "overdue": 2, "byStatus": { "To Do": 6, "In Progress": 3, "Done": 3 } },
    "projects": { "total": 3, "active": 2 },
    "employees": 2
  }
}
```
לעובד מוחזרים רק `scope: "mine"` ו־`tasks`, ומספרי המשימות הם רק של המשימות שלו.

### 📋 מסך Tasks (רשימת משימות)
| פעולה | בקשה |
|-------|------|
| רשימה עם חיפוש, סינון, מיון ועימוד | `GET /api/tasks?...` |
| אפשרויות לסינון לפי פרויקט | `GET /api/projects` |
| (מנהל) סינון לפי עובד | `GET /api/users?role=Employee` |

פרמטרים (כולם אופציונליים):

| פרמטר | ערכים | ברירת מחדל |
|-------|-------|------------|
| `search` | טקסט שמופיע בכותרת (לא משנה אותיות גדולות או קטנות) | |
| `status` | `To Do` / `In Progress` / `Done` | |
| `priority` | `Low` / `Medium` / `High` | |
| `projectId` | מספר | |
| `assignedTo` | מספר (רק למנהל; לעובד הוא מתעלם) | |
| `overdue` | `true` / `false` | |
| `sortBy` | `dueDate` / `createdAt` / `title` | `dueDate` |
| `sortOrder` | `asc` / `desc` | `asc` |
| `page` | 1 ומעלה | 1 |
| `pageSize` | 1–100 | 10 |

דוגמה: `GET /api/tasks?search=login&status=In%20Progress&sortBy=dueDate&sortOrder=asc&page=1&pageSize=10`
(רווח ב־URL מקודד כ־`%20`. ספריות כמו `URLSearchParams` עושות את זה לבד.)

תשובה:
```json
{
  "data": [
    {
      "id": 1,
      "title": "Design the login screen",
      "description": "Layout and validation messages for the login page",
      "priority": "High",
      "status": "In Progress",
      "dueDate": "2026-10-24",
      "isOverdue": false,
      "assignedTo": { "id": 2, "name": "Noa Cohen" },
      "createdBy": { "id": 1, "name": "Dana Admin" },
      "project": { "id": 1, "name": "Website Redesign" },
      "commentCount": 2,
      "createdAt": "2026-10-19T08:00:00.000Z",
      "updatedAt": "2026-10-19T08:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 10, "total": 1, "totalPages": 1 }
}
```

### ➕ מסך Create Task (מנהל בלבד)
| פעולה | בקשה |
|-------|------|
| רשימת עובדים לבחירה | `GET /api/users?role=Employee` |
| רשימת פרויקטים לבחירה | `GET /api/projects?status=Active` |
| שמירה | `POST /api/tasks` |

בקשה:
```json
{
  "title": "Prepare the monthly report",
  "description": "Summary of all completed tasks",
  "assignedTo": 2,
  "projectId": 1,
  "priority": "Medium",
  "dueDate": "2026-11-15"
}
```

| שדה | חובה | כללים |
|-----|:----:|-------|
| `title` | ✅ | 1–200 תווים (רווחים בהתחלה ובסוף נמחקים) |
| `description` | | עד 5000 תווים; ריק נשמר כ־`null` |
| `assignedTo` | ✅ | **מספר**, ה־id של משתמש עם תפקיד Employee |
| `projectId` | ✅ | **מספר**, ה־id של פרויקט קיים |
| `priority` | ✅ | `Low` / `Medium` / `High` |
| `status` | | ברירת מחדל `To Do` |
| `dueDate` | ✅ | `YYYY-MM-DD` |

- `assignedTo` ו־`projectId` חייבים להישלח **כמספרים** (`2`), ולא כמחרוזות (`"2"`). ערך של `<select>` הוא מחרוזת, אז צריך להמיר אותו למספר.
- **אסור** לשלוח `createdBy`. השרת קובע אותו לפי הטוקן, ושדה לא מוכר מחזיר 400.
- תשובה `201` עם המשימה המלאה ב־`data`.

### 🔎 מסך Task Details
| פעולה | בקשה |
|-------|------|
| פרטי משימה | `GET /api/tasks/:id` |
| הערות | `GET /api/tasks/:id/comments` |
| הוספת הערה | `POST /api/tasks/:id/comments` |
| עדכון סטטוס (עובד או מנהל) | `PATCH /api/tasks/:id` עם `{ "status": "Done" }` |
| עריכת שדות (מנהל) | `PATCH /api/tasks/:id` עם השדות שהשתנו |
| מחיקה (מנהל) | `DELETE /api/tasks/:id` (תשובה 204) |

הוספת הערה, בקשה:
```json
{ "content": "I started working on this today" }
```
תשובה 201:
```json
{
  "data": {
    "id": 5,
    "taskId": 1,
    "content": "I started working on this today",
    "user": { "id": 2, "name": "Noa Cohen", "role": "Employee" },
    "createdAt": "2026-10-19T09:30:00.000Z"
  }
}
```
`content` הוא שדה חובה, 1–2000 תווים, ולא יכול להכיל רק רווחים.

עריכה (PATCH): שולחים **רק** את השדות שהשתנו.
- **עובד:** מותר לשלוח רק `{ "status": "..." }`. כל שדה אחר מחזיר 403.
- **מנהל:** כל אחד מהשדות `title`, `description`, `assignedTo`, `projectId`, `priority`, `status`, `dueDate`.

הערות מוחזרות מהישנה לחדשה. אחרי הוספת הערה או עדכון, כדאי לרענן את הנתונים של המסך.

### 👥 מסך Employees (מנהל בלבד)
| פעולה | בקשה |
|-------|------|
| רשימת משתמשים | `GET /api/users` (אופציונלי: `?role=Employee&search=noa`) |
| הוספת עובד | `POST /api/users` |

תשובה:
```json
{ "data": [ { "id": 2, "name": "Noa Cohen", "email": "noa@taskflow.test", "role": "Employee", "createdAt": "2026-10-19T08:00:00.000Z" } ] }
```
הוספת עובד, בקשה:
```json
{ "name": "Maya Levi", "email": "maya@taskflow.test", "password": "Welcome123", "role": "Employee" }
```
| שדה | חובה | כללים |
|-----|:----:|-------|
| `name` | ✅ | 1–100 תווים |
| `email` | ✅ | אימייל תקין וייחודי (אחרת 409) |
| `password` | ✅ | 8–128 תווים, לפחות אות אחת וספרה אחת |
| `role` | | `Employee` (ברירת מחדל) או `Admin` |

### 📁 פרויקטים (אם תרצי מסך פרויקטים)
| פעולה | בקשה |
|-------|------|
| רשימה | `GET /api/projects` (אופציונלי: `?status=Active&search=web`) |
| פרטים | `GET /api/projects/:id` |
| יצירה (מנהל) | `POST /api/projects` |
| עריכה (מנהל) | `PATCH /api/projects/:id` |

יצירה, בקשה:
```json
{ "name": "Mobile App", "description": "First version", "startDate": "2026-11-01", "endDate": "2027-02-28", "status": "Active" }
```
| שדה | חובה | כללים |
|-----|:----:|-------|
| `name` | ✅ | 1–150 תווים |
| `description` | | עד 5000 תווים |
| `startDate` | ✅ | `YYYY-MM-DD` |
| `endDate` | | `YYYY-MM-DD`, לא לפני `startDate` |
| `status` | | `Active` (ברירת מחדל) / `Completed` / `On Hold` |

---

## 8. רשימה מלאה של ה־Endpoints

| Method | URL | הרשאה | הצלחה |
|--------|-----|-------|-------|
| GET | `/api/health` | ציבורי | 200 |
| POST | `/api/auth/login` | ציבורי | 200 |
| POST | `/api/auth/logout` | מחובר | 200 |
| GET | `/api/auth/me` | מחובר | 200 |
| GET | `/api/dashboard/summary` | מחובר | 200 |
| GET | `/api/tasks` | מחובר | 200 |
| GET | `/api/tasks/:id` | מנהל / בעל המשימה | 200 |
| POST | `/api/tasks` | מנהל | 201 |
| PATCH | `/api/tasks/:id` | מנהל / בעל המשימה (רק status) | 200 |
| DELETE | `/api/tasks/:id` | מנהל | 204 |
| GET | `/api/tasks/:id/comments` | מנהל / בעל המשימה | 200 |
| POST | `/api/tasks/:id/comments` | מנהל / בעל המשימה | 201 |
| GET | `/api/projects` | מחובר | 200 |
| GET | `/api/projects/:id` | מחובר (עובד: רק פרויקט רלוונטי) | 200 |
| POST | `/api/projects` | מנהל | 201 |
| PATCH | `/api/projects/:id` | מנהל | 200 |
| GET | `/api/users` | מנהל | 200 |
| POST | `/api/users` | מנהל | 201 |

---

## 9. משתמשי הדגמה

| תפקיד | אימייל | סיסמה (מחשב מקומי) |
|-------|--------|--------------------|
| מנהל | `admin@taskflow.test` | `Admin123!` |
| עובדת | `noa@taskflow.test` | `Employee123!` |
| עובד | `yossi@taskflow.test` | `Employee123!` |

בענן הסיסמאות הן אלה שהגדרת ב־Render (`SEED_ADMIN_PASSWORD` / `SEED_EMPLOYEE_PASSWORD`).

---

## 10. שאלות שהמרצה עשויה לשאול, ותשובות קצרות

- **לאיזה API ה־React פונה?** לשרת Express בכתובת ה־Base URL, לנתיבים שמתחילים ב־`/api`.
- **מה נשלח לשרת?** JSON בגוף הבקשה (POST/PATCH), פרמטרים ב־URL לחיפוש וסינון, והטוקן בכותרת `Authorization`.
- **מה חוזר?** JSON במבנה `{ data }` בהצלחה, או `{ error }` בשגיאה, עם קוד HTTP מתאים.
- **איך נשמר המידע?** השרת שומר במסד PostgreSQL (בענן: Neon), דרך Prisma. יש 4 טבלאות: users, projects, tasks, comments.
- **איך מתבצעת ההתחברות?** השרת בודק את הסיסמה מול ה־hash (bcrypt) ומחזיר JWT חתום. הלקוח שולח את הטוקן בכל בקשה, והשרת מאמת אותו ומזהה את המשתמש.
- **איך עובדות ההרשאות?** השרת בודק בכל בקשה את התפקיד (Admin/Employee) ואת הבעלות על המשימה. הסתרת כפתורים ב־React היא רק לנוחות.
